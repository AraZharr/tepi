import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'
import { createDNSRecord } from '@/lib/cloudflare-dns'
import { sendEmail, emailApplicationApproved, emailApplicationRejected } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { safeJsonParse } from '@/lib/safe-json'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user
  try { user = await requireAdmin() } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { status, reject_reason } = await req.json()

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
  }

  if (status === 'rejected' && !reject_reason) {
    return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
  }

  const db = await getDB()

  const app = await db.prepare(
    `SELECT sa.*, u.email, u.full_name, u.role
     FROM subdomain_applications sa
     JOIN users u ON u.id = sa.user_id
     WHERE sa.id = ?`
  ).bind(id).first() as Record<string, unknown> | null

  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  if (status === 'rejected') {
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

    // In-app notif
    await createNotification(
      app.user_id as string, 'application_rejected',
      'Pengajuan subdomain ditolak',
      `Subdomain ${app.subdomain_name}.tepi.my.id tidak bisa disetujui. Alasan: ${reject_reason}`,
      '/dashboard'
    )

    return NextResponse.json({ success: true, action: 'rejected' })
  }

  // Approve — create DNS records + subdomain
  const recordName = `${app.subdomain_name as string}.tepi.my.id`
  const dnsRecords = app.dns_records ? (safeJsonParse(app.dns_records as string) || [{ type: app.record_type || 'CNAME', value: app.record_value || '' }]) : 
    [{ type: app.record_type || 'CNAME', value: app.record_value || '' }] // Backward compat

  const createdRecords: any[] = []

  // Create all DNS records
  for (const rec of dnsRecords) {
    const dnsResult = await createDNSRecord({
      type: rec.type as 'CNAME' | 'A' | 'TXT',
      name: recordName,
      content: rec.value,
      proxied: true,
    })

    if (!dnsResult.success) {
      console.error('[Admin Approve] DNS creation failed:', {
        subdomain: app.subdomain_name,
        type: rec.type,
        name: recordName,
        content: rec.value,
        error: dnsResult.error,
      })
      return NextResponse.json({ 
        error: `DNS creation failed: ${dnsResult.error}`,
        _debug: { type: rec.type, name: recordName, content: rec.value }
      }, { status: 500 })
    }

    createdRecords.push({ type: rec.type, value: rec.value, cf_record_id: dnsResult.result?.id })
  }

  // Use first record as primary target for subdomain table
  const primaryRecord = createdRecords[0]

  // Update application status → approved
  await db.prepare(
    `UPDATE subdomain_applications SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?`
  ).bind(id).run()

  // Create subdomain — langsung active (admin approved = trusted)
  const expiresAt = new Date(Date.now() + 90 * 86400000).toISOString().replace('T', ' ').replace(/\..*/, '') // free 3 bulan
  const isAdminClaim = (app.role as string) === 'admin'

  await db.prepare(
    `INSERT INTO subdomains (user_id, name, target_type, target_value, cf_record_id, status, plan, expires_at)
     VALUES (?, ?, ?, ?, ?, 'active', 'free', ?)`
  ).bind(
    app.user_id,
    app.subdomain_name,
    primaryRecord.type,
    primaryRecord.value,
    primaryRecord.cf_record_id ?? null,
    isAdminClaim ? null : expiresAt // Admin = never expires
  ).run()

  // Log activity
  await db.prepare(
    `INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'approve', ?)`
  ).bind(user.id, JSON.stringify({ application_id: id, subdomain: app.subdomain_name })).run()

  // Send approval email (skip untuk admin claim)
  if (!isAdminClaim) {
    try {
      await sendEmail(emailApplicationApproved(
        (app.full_name as string) || (app.email as string),
        app.subdomain_name as string
      ))
    } catch { /* email optional */ }
  }

  // In-app notif
  await createNotification(
    app.user_id as string, 'application_approved',
    'Subdomain disetujui! 🎉',
    `Selamat! ${app.subdomain_name}.tepi.my.id kamu sudah aktif.`,
    '/dashboard'
  )

  return NextResponse.json({ success: true, action: 'approved' })
}
