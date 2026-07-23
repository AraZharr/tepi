import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'
import { createDNSRecord } from '@/lib/cloudflare-dns'
import { sendEmail, emailApplicationApproved, emailApplicationRejected } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { safeJsonParse } from '@/lib/safe-json'
import { dispatchWebhook } from '@/lib/webhooks'

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

  // Also get NS records if add-on enabled
  const nsRecords = app.ns_records ? (safeJsonParse(app.ns_records as string) || []) : []

  const createdRecords: any[] = []
  const nsRecordIds: string[] = []

  // Create all DNS records (CNAME, A, TXT)
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

  // Create NS records if add-on enabled
  if (app.ns_addon && nsRecords.length > 0) {
    for (const ns of nsRecords) {
      const dnsResult = await createDNSRecord({
        type: 'NS',
        name: recordName,
        content: ns,
        proxied: false, // NS records cannot be proxied
      })

      if (!dnsResult.success) {
        console.error('[Admin Approve] NS record creation failed:', {
          subdomain: app.subdomain_name,
          ns,
          error: dnsResult.error,
        })
        return NextResponse.json({ 
          error: `NS record creation failed: ${dnsResult.error}`,
          _debug: { ns, name: recordName }
        }, { status: 500 })
      }

      createdRecords.push({ type: 'NS', value: ns, cf_record_id: dnsResult.result?.id })
      nsRecordIds.push(dnsResult.result?.id as string)
    }
  }

  // Use first record as primary target for subdomain table
  const primaryRecord = createdRecords[0]

  // Update application status → approved
  await db.prepare(
    `UPDATE subdomain_applications SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?`
  ).bind(id).run()

  // Create subdomain — langsung active (admin approved = trusted)
  // Determine plan: free = 3 months, paid = 1 year (if paid)
  const isPaid = (app.plan as string) === 'paid' || (app.ns_addon as number) === 1
  const expiresAt = new Date(Date.now() + (isPaid ? 365 : 90) * 86400000).toISOString().replace('T', ' ').replace(/\..*/, '')
  const isAdminClaim = (app.role as string) === 'admin'

  await db.prepare(
    `INSERT INTO subdomains (user_id, name, target_type, target_value, cf_record_id, status, plan, expires_at, ns_addon, ns_record_ids, auto_renew)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
  ).bind(
    app.user_id,
    app.subdomain_name,
    primaryRecord.type,
    primaryRecord.value,
    primaryRecord.cf_record_id ?? null,
    isPaid ? 'paid' : 'free',
    isAdminClaim ? null : expiresAt,
    app.ns_addon ? 1 : 0,
    nsRecordIds.length > 0 ? JSON.stringify(nsRecordIds) : null,
    isPaid ? 1 : 0 // auto_renew default ON for paid
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

  // Dispatch outgoing webhook
  await dispatchWebhook(app.user_id as string, 'subdomain.created', {
    subdomain: app.subdomain_name,
    full_domain: `${app.subdomain_name}.tepi.my.id`,
    target_type: primaryRecord.type,
    target_value: primaryRecord.value,
    plan: isPaid ? 'paid' : 'free',
    expires_at: isAdminClaim ? null : expiresAt,
    ns_addon: app.ns_addon ? 1 : 0,
  })

  return NextResponse.json({ success: true, action: 'approved' })
}
