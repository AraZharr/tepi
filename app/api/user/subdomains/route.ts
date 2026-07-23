import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { validateSubdomainName, validateDNSValue } from '@/lib/validators'
import { isReserved } from '@/lib/reserved'
import { autoScanSubdomain } from '@/lib/auto-scan'
import { verifyTurnstile } from '@/lib/turnstile'
import { notifNewApplication } from '@/lib/admin-notif'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDB()

  const [applications, subdomains] = await Promise.all([
    db.prepare(
      `SELECT id, subdomain_name, dns_records, record_type, record_value, status, reject_reason, created_at
       FROM subdomain_applications WHERE user_id = ? ORDER BY created_at DESC`
    ).bind(user.id).all(),
    db.prepare(
      `SELECT id, name, target_type, target_value, status, plan, expires_at, created_at
       FROM subdomains WHERE user_id = ? ORDER BY created_at DESC`
    ).bind(user.id).all(),
  ])

  // Get user role + limit
  const userRecord = await db.prepare('SELECT role, subdomain_limit FROM users WHERE id = ?').bind(user.id).first() as any
  const isAdmin = userRecord?.role === 'admin'
  const maxDomains = userRecord?.subdomain_limit ?? (isAdmin ? 999 : 2)

  return NextResponse.json({
    applications: applications.results ?? [],
    subdomains: subdomains.results ?? [],
    maxDomains,
    isAdmin,
  })
}

export async function POST(req: Request) {
  try {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: any = await req.json()
  console.log('[Subdomain Submit] Step 1: Request received', {
    user_id: user.id,
    subdomain_name: body.subdomain_name,
    dns_records_count: body.dns_records?.length
  })
  
  const { subdomain_name, dns_records, project_type, project_description,
    is_public, has_monetization, github_link, linkedin_link, social_link, turnstile_token } = body

  // Validate Turnstile
  const captchaValid = await verifyTurnstile(turnstile_token || '')
  if (!captchaValid) {
    console.error('[Subdomain Submit] Step 2: Turnstile FAILED')
    return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal. Coba lagi.' }, { status: 400 })
  }
  console.log('[Subdomain Submit] Step 2: Turnstile OK')

  // Validate subdomain name
  const nameCheck = validateSubdomainName(subdomain_name)
  if (!nameCheck.valid) return NextResponse.json({ error: nameCheck.error }, { status: 400 })

  // Double-check reserved names
  if (isReserved(subdomain_name)) {
    return NextResponse.json({ error: 'Nama ini tidak tersedia.' }, { status: 400 })
  }

  // Validate DNS records array
  if (!Array.isArray(dns_records) || dns_records.length === 0 || dns_records.length > 4) {
    return NextResponse.json({ error: 'DNS records harus array dengan 1-4 entries' }, { status: 400 })
  }
  for (const rec of dns_records) {
    if (!rec.type || !rec.value) {
      return NextResponse.json({ error: 'Semua DNS record harus punya type dan value' }, { status: 400 })
    }
    if (!['CNAME', 'A', 'TXT'].includes(rec.type)) {
      return NextResponse.json({ error: `Tipe record tidak valid: ${rec.type}` }, { status: 400 })
    }
    const valueCheck = validateDNSValue(rec.type, rec.value)
    if (!valueCheck.valid) {
      return NextResponse.json({ error: `Record ${rec.type}: ${valueCheck.error}` }, { status: 400 })
    }
  }

  if (!project_type || !project_description) {
    return NextResponse.json({ error: 'Project type and description required' }, { status: 400 })
  }
  if (project_description.length < 20) {
    return NextResponse.json({ error: 'Deskripsi minimal 20 karakter' }, { status: 400 })
  }

  const db = await getDB()
  console.log('[Subdomain Submit] Step 3: DB connected')

  // Check subdomain limit
  const userRecord = await db.prepare('SELECT role, subdomain_limit FROM users WHERE id = ?').bind(user.id).first() as any
  const isAdmin = userRecord?.role === 'admin'
  const maxDomains = userRecord?.subdomain_limit ?? (isAdmin ? 999 : 2)
  console.log('[Subdomain Submit] Step 4: User limits checked', { isAdmin, maxDomains, user_id: user.id })

  if (!isAdmin) {
    const activeCount = await db.prepare(
      `SELECT COUNT(*) as count FROM subdomains WHERE user_id = ? AND status IN ('active', 'pending')`
    ).bind(user.id).first() as any
    if (activeCount?.count >= maxDomains) {
      return NextResponse.json({
        error: `Kamu sudah mencapai batas maksimal ${maxDomains} subdomain. Upgrade ke paid untuk menambah.`
      }, { status: 400 })
    }
  }

  // Check if subdomain name already taken
  const existing = await db.prepare(
    `SELECT id FROM subdomains WHERE name = ? UNION SELECT id FROM subdomain_applications WHERE subdomain_name = ? AND status = 'pending'`
  ).bind(subdomain_name, subdomain_name).first()
  console.log('[Subdomain Submit] Step 5: Availability check', { subdomain_name, exists: !!existing })
  if (existing) {
    return NextResponse.json({ error: 'Nama subdomain sudah digunakan atau sedang diproses' }, { status: 409 })
  }

  // Auto-scan untuk quarantine (scan first DNS record value)
  console.log('[Subdomain Submit] Step 6: Starting auto-scan', { subdomain_name, target: dns_records[0].value })
  const scan = await autoScanSubdomain(subdomain_name, dns_records[0].value)
  console.log('[Subdomain Submit] Step 6: Auto-scan complete', { passed: scan.passed, issues: scan.issues?.length || 0 })
  const quarantineStatus = scan.passed ? 'quarantine' : 'quarantine'
  // Semua new claim masuk quarantine dulu sampai lolos review atau auto-cleared

  // Try insert with dns_records column first (new schema)
  // Fallback to record_type/record_value if column doesn't exist (old schema)
  console.log('[Subdomain Submit] Step 7: Inserting to DB', { subdomain_name, dns_records_count: dns_records.length })
  try {
    await db.prepare(
      `INSERT INTO subdomain_applications (user_id, subdomain_name, dns_records, project_type,
        project_description, is_public, has_monetization, github_link, linkedin_link, social_link, record_type, record_value, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(
      user.id,
      subdomain_name.toLowerCase().trim(),
      JSON.stringify(dns_records),
      project_type,
      project_description,
      is_public ? 1 : 0,
      has_monetization ? 1 : 0,
      github_link || null,
      linkedin_link || null,
      social_link || null,
      dns_records[0].type.toUpperCase(),
      dns_records[0].value.trim(),
    ).run()
    console.log('[Subdomain Submit] Step 7: DB INSERT success (new schema)')
  } catch (err: any) {
    // Fallback: use old schema (record_type + record_value) for first record only
    console.warn('[Subdomain Submit] Step 7: Fallback to legacy schema', { error: err.message })
    const firstRecord = dns_records[0]
    await db.prepare(
      `INSERT INTO subdomain_applications (user_id, subdomain_name, record_type, record_value, project_type,
        project_description, is_public, has_monetization, github_link, linkedin_link, social_link, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(
      user.id,
      subdomain_name.toLowerCase().trim(),
      firstRecord.type.toUpperCase(),
      firstRecord.value.trim(),
      project_type,
      project_description,
      is_public ? 1 : 0,
      has_monetization ? 1 : 0,
      github_link || null,
      linkedin_link || null,
      social_link || null,
    ).run()
    console.log('[Subdomain Submit] Step 7: DB INSERT success (legacy schema)')
  }

  // Push notif admin
  console.log('[Subdomain Submit] Step 8: Sending admin notification')
  notifNewApplication(
    user.full_name || user.email?.split('@')[0] || user.id,
    user.email || '',
    subdomain_name,
    project_description,
    0,
  )

  // Send confirmation email to user
  console.log('[Subdomain Submit] Step 9: Sending user email')
  try {
    const { sendEmail, emailApplicationReceived } = await import('@/lib/email')
    await sendEmail(emailApplicationReceived(
      user.full_name || user.email?.split('@')[0] || 'User',
      subdomain_name
    ))
  } catch (err) {
    console.error('[Subdomain Submit] Failed to send user confirmation email:', err)
  }

  // Log activity
  console.log('[Subdomain Submit] Step 10: Logging activity')
  await db.prepare(
    `INSERT INTO activity_logs (user_id, action, detail, ip_address)
     VALUES (?, 'claim', ?, ?)`
  ).bind(
    user.id,
    JSON.stringify({ subdomain: subdomain_name, scan_issues: scan.issues }),
    req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
  ).run()

  return NextResponse.json({
    success: true,
    scan_result: scan,
    message: scan.passed
      ? 'Pengajuan diterima! Menunggu review admin.'
      : 'Pengajuan diterima dengan catatan. Kami akan review secara manual.',
  })
  } catch (error: any) {
    console.error('[Subdomain Submit] Unhandled error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      details: error.stack, // Always show in production for debugging
      context: 'Top-level catch'
    }, { status: 500 })
  }
}
