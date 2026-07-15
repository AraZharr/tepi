import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDB } from '@/lib/db'
import { validateSubdomainName, validateTargetURL } from '@/lib/validators'
import { isReserved } from '@/lib/reserved'
import { autoScanSubdomain } from '@/lib/auto-scan'
import { verifyTurnstile } from '@/lib/turnstile'
import { notifNewApplication } from '@/lib/admin-notif'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDB()

  const [applications, subdomains] = await Promise.all([
    db.prepare(
      `SELECT id, subdomain_name, target_platform, target_url, status, reject_reason, created_at
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { subdomain_name, target_platform, target_url, project_type, project_description,
    is_public, has_monetization, github_link, linkedin_link, social_link, turnstile_token } = body

  // Validate Turnstile
  const captchaValid = await verifyTurnstile(turnstile_token || '')
  if (!captchaValid) {
    return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal. Coba lagi.' }, { status: 400 })
  }

  // Validate subdomain name
  const nameCheck = validateSubdomainName(subdomain_name)
  if (!nameCheck.valid) return NextResponse.json({ error: nameCheck.error }, { status: 400 })

  // Double-check reserved names
  if (isReserved(subdomain_name)) {
    return NextResponse.json({ error: 'Nama ini tidak tersedia.' }, { status: 400 })
  }

  // Validate URL
  const urlCheck = validateTargetURL(target_url)
  if (!urlCheck.valid) return NextResponse.json({ error: urlCheck.error }, { status: 400 })

  if (!project_type || !project_description) {
    return NextResponse.json({ error: 'Project type and description required' }, { status: 400 })
  }
  if (project_description.length < 100) {
    return NextResponse.json({ error: 'Deskripsi minimal 100 karakter' }, { status: 400 })
  }

  const db = await getDB()

  // Check subdomain limit
  const userRecord = await db.prepare('SELECT role, subdomain_limit FROM users WHERE id = ?').bind(user.id).first() as any
  const isAdmin = userRecord?.role === 'admin'
  const maxDomains = userRecord?.subdomain_limit ?? (isAdmin ? 999 : 2)

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
  if (existing) {
    return NextResponse.json({ error: 'Nama subdomain sudah digunakan atau sedang diproses' }, { status: 409 })
  }

  // Auto-scan untuk quarantine
  const scan = await autoScanSubdomain(subdomain_name, target_url)
  const quarantineStatus = scan.passed ? 'quarantine' : 'quarantine'
  // Semua new claim masuk quarantine dulu sampai lolos review atau auto-cleared

  await db.prepare(
    `INSERT INTO subdomain_applications (user_id, subdomain_name, target_platform, target_url, project_type,
      project_description, is_public, has_monetization, github_link, linkedin_link, social_link, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(
    user.id,
    subdomain_name.toLowerCase().trim(),
    target_platform,
    target_url,
    project_type,
    project_description,
    is_public ? 1 : 0,
    has_monetization ? 1 : 0,
    github_link || null,
    linkedin_link || null,
    social_link || null,
  ).run()

  // Push notif admin
  notifNewApplication(
    user.user_metadata?.full_name as string || user.email?.split('@')[0] || user.id,
    user.email || '',
    subdomain_name,
    project_description,
    0,
  )

  // Log activity
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
}
