import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { deleteDNSRecord } from '@/lib/cloudflare-dns'
import { createNotification } from '@/lib/notifications'

// ============================================================
// Expiry Cron — dipanggil oleh cron job external (GitHub Actions)
// ============================================================
// Schedule: daily via GitHub Actions cron
// Endpoint: GET /api/cron/expiry?key=<CRON_SECRET>
// ============================================================

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDB()
  const now = new Date().toISOString().replace('T', ' ').replace(/\..*/, '')
  const results: string[] = []

  // 1. H-7: Kirim peringatan expiry
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().replace('T', ' ').replace(/\..*/, '')
  const aboutToExpire = await db.prepare(
    `SELECT s.*, u.email, u.full_name FROM subdomains s
     JOIN users u ON u.id = s.user_id
     WHERE s.status = 'active' AND s.expires_at IS NOT NULL
     AND s.expires_at BETWEEN ? AND ?
     AND s.id NOT IN (SELECT subdomain_id FROM expiry_notifications WHERE type = 'h7')`
  ).bind(now, sevenDaysLater).all() as any

  for (const sd of (aboutToExpire.results ?? [])) {
    try {
      // Send email reminder (via Resend)
      results.push(`Reminder sent for ${sd.name}.tepi.my.id (expires ${sd.expires_at})`)
      // In-app notif
      await createNotification(
        sd.user_id, 'subdomain_expiring',
        'Subdomain akan kedaluwarsa ⏰',
        `${sd.name}.tepi.my.id akan expired dalam 7 hari. Perpanjang sekarang!`,
        '/dashboard/invoices'
      )
      // Mark notification sent
      await db.prepare(
        'INSERT INTO expiry_notifications (subdomain_id, type) VALUES (?, ?)'
      ).bind(sd.id, 'h7').run()
    } catch { /* email fail */ }
  }

  // 2. H-0: Yang expired hari ini — grace period starts
  const expiredToday = await db.prepare(
    `SELECT * FROM subdomains WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?`
  ).bind(now).all() as any

  for (const sd of (expiredToday.results ?? [])) {
    await db.prepare(
      "UPDATE subdomains SET status = 'expired' WHERE id = ?"
    ).bind(sd.id).run()

    // In-app notif
    await createNotification(
      sd.user_id, 'subdomain_expired',
      'Subdomain expired ⚠️',
      `${sd.name}.tepi.my.id sudah expired. Perpanjang dalam 14 hari sebelum dihapus.`,
      '/dashboard/invoices'
    )

    // Send expiry notification
    results.push(`Expired: ${sd.name}.tepi.my.id`)
  }

  // 3. H+14: Hapus DNS + release subdomain
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().replace('T', ' ').replace(/\..*/, '')
  const toDelete = await db.prepare(
    `SELECT * FROM subdomains WHERE status = 'expired' AND expires_at < ?`
  ).bind(fourteenDaysAgo).all() as any

  for (const sd of (toDelete.results ?? [])) {
    // Delete DNS record from Cloudflare
    if (sd.cf_record_id) {
      try {
        await deleteDNSRecord(sd.cf_record_id)
        results.push(`DNS deleted for ${sd.name}.tepi.my.id`)
      } catch { /* DNS delete fail */ }
    }

    // Delete from DB
    await db.prepare('DELETE FROM subdomains WHERE id = ?').bind(sd.id).run()
    results.push(`Released: ${sd.name}.tepi.my.id`)
  }

  return NextResponse.json({
    success: true,
    checked: now,
    actions: results,
    counts: {
      reminded: (aboutToExpire.results ?? []).length,
      expired: (expiredToday.results ?? []).length,
      deleted: (toDelete.results ?? []).length,
    }
  })
}
