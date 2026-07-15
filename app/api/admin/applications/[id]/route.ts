import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDB } from '@/lib/db'
import { createDNSRecord } from '@/lib/cloudflare-dns'
import { sendEmail, emailApplicationApproved, emailApplicationRejected } from '@/lib/resend'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { status, reject_reason } = body

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
  }

  if (status === 'rejected' && !reject_reason) {
    return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
  }

  const db = await getDB()

  // Get application
  const app = await db.prepare(
    `SELECT sa.*, u.email, u.full_name
     FROM subdomain_applications sa
     JOIN users u ON u.id = sa.user_id
     WHERE sa.id = ?`
  ).bind(id).first() as Record<string, unknown> | null

  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  if (status === 'rejected') {
    // Just reject — update status, send email
    await db.prepare(
      `UPDATE subdomain_applications SET status = 'rejected', reject_reason = ?, reviewed_at = datetime('now') WHERE id = ?`
    ).bind(reject_reason, id).run()

    try {
      await sendEmail(emailApplicationRejected(
        (app.full_name as string) || (app.email as string),
        app.subdomain_name as string,
        reject_reason
      ))
    } catch { /* email optional */ }

    return NextResponse.json({ success: true, action: 'rejected' })
  }

  // Approve — create DNS record + subdomain record
  const recordName = `${app.subdomain_name as string}.tepi.my.id`
  let targetType: 'CNAME' | 'A' = 'CNAME'
  let targetValue = ''

  // Parse target URL to extract domain
  try {
    const url = new URL(app.target_url as string)
    targetValue = url.hostname
    // Use A record if it's an IP
    const ipMatch = targetValue.match(/^(\d{1,3}\.){3}\d{1,3}$/)
    if (ipMatch) targetType = 'A'
  } catch {
    targetValue = app.target_url as string
  }

  // Create DNS record
  const dnsResult = await createDNSRecord({
    type: targetType,
    name: recordName,
    content: targetValue,
    proxied: true,
  })

  if (!dnsResult.success) {
    return NextResponse.json({ error: `DNS creation failed: ${dnsResult.error}` }, { status: 500 })
  }

  // Update application status
  await db.prepare(
    `UPDATE subdomain_applications SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?`
  ).bind(id).run()

  // Create subdomain record
  const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString().replace('T', ' ').replace(/\..*/, '')
  await db.prepare(
    `INSERT INTO subdomains (user_id, name, target_type, target_value, cf_record_id, status, plan, expires_at)
     VALUES (?, ?, ?, ?, ?, 'active', 'free', ?)`
  ).bind(
    app.user_id,
    app.subdomain_name,
    targetType,
    targetValue,
    dnsResult.result?.id ?? null,
    expiresAt
  ).run()

  // Send approval email
  try {
    await sendEmail(emailApplicationApproved(
      (app.full_name as string) || (app.email as string),
      app.subdomain_name as string
    ))
  } catch { /* email optional */ }

  return NextResponse.json({ success: true, action: 'approved' })
}
