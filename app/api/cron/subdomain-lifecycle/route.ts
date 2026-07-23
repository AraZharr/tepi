import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { deleteDNSRecord } from '@/lib/cloudflare-dns'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

// This runs daily at 2 AM UTC via wrangler.toml cron trigger
export async function GET() {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = (await import('next/headers')).headers().get('authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = await getDB()
  const now = new Date().toISOString().replace('T', ' ').replace(/\..*/, '')
  const results = {
    suspended: 0,
    deleted: 0,
    notifications_sent: 0,
    errors: [] as string[],
  }

  try {
    // 1. Find expired subdomains that are still active
    const expired = await db.prepare(
      `SELECT s.*, u.email, u.full_name
       FROM subdomains s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'active' AND s.expires_at IS NOT NULL AND s.expires_at < ?`
    ).bind(now).all()

    for (const sd of expired.results ?? []) {
      try {
        // Suspend subdomain
        await db.prepare(
          `UPDATE subdomains SET status = 'suspended', updated_at = datetime('now') WHERE id = ?`
        ).bind(sd.id).run()

        // Delete DNS records from Cloudflare
        if (sd.cf_record_id) {
          await deleteDNSRecord(sd.cf_record_id as string)
        }

        // Delete NS records if exists
        const nsRecords = sd.ns_records ? JSON.parse(sd.ns_records as string) : []
        for (const ns of nsRecords) {
          // NS records don't have cf_record_id stored, need to list and find
          // For now, log - ideally we'd store NS record IDs too
        }

        // Send email
        try {
          await sendEmail({
            to: sd.email as string,
            subject: `Subdomain ${sd.name}.tepi.my.id Telah Expired`,
            html: `
              <p>Halo ${sd.full_name || sd.email},</p>
              <p>Subdomain <strong>${sd.name}.tepi.my.id</strong> telah melewati masa aktifnya dan ditangguhkan.</p>
              <p>DNS record telah dihapus. Kamu bisa memperpanjang di dashboard untuk mengaktifkan kembali.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Buka Dashboard</a></p>
            `
          })
          results.notifications_sent++
        } catch (e) {
          console.error('[Cron] Email failed:', e)
        }

        // In-app notification
        await createNotification(
          sd.user_id as string,
          'subdomain_suspended',
          'Subdomain Ditangguhkan',
          `${sd.name}.tepi.my.id telah expired dan ditangguhkan`,
          '/dashboard'
        )

        results.suspended++
      } catch (e: any) {
        results.errors.push(`Suspend ${sd.id}: ${e.message}`)
      }
    }

    // 2. Find subdomains expiring soon (H-30, H-7, H-1) - send reminders
    const upcoming = await db.prepare(
      `SELECT s.*, u.email, u.full_name
       FROM subdomains s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'active' AND s.expires_at IS NOT NULL
         AND s.expires_at > ?
         AND (
           date(s.expires_at) = date(?, '+30 days') OR
           date(s.expires_at) = date(?, '+7 days') OR
           date(s.expires_at) = date(?, '+1 day')
         )`
    ).bind(now, now, now, now).all()

    for (const sd of upcoming.results ?? []) {
      try {
        const expDate = new Date((sd.expires_at as string).replace(' ', 'T') + 'Z')
        const nowDate = new Date(now.replace(' ', 'T') + 'Z')
        const daysLeft = Math.ceil((expDate.getTime() - nowDate.getTime()) / 86400000)

        await sendEmail({
          to: sd.email as string,
          subject: `Pengingat: ${sd.name}.tepi.my.id Expired dalam ${daysLeft} Hari`,
          html: `
            <p>Halo ${sd.full_name || sd.email},</p>
            <p>Subdomain <strong>${sd.name}.tepi.my.id</strong> akan expired dalam <strong>${daysLeft} hari</strong> (${expDate.toLocaleDateString('id-ID')}).</p>
            <p>Perpanjang sekarang agar tidak terganggu:</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Perpanjang di Dashboard</a></p>
          `
        })
        results.notifications_sent++
      } catch (e) {
        console.error('[Cron] Reminder email failed:', e)
      }
    }

    // 3. Grace period: delete DNS after 7 days suspended
    const graceExpired = await db.prepare(
      `SELECT s.*, u.email, u.full_name
       FROM subdomains s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'suspended' AND s.updated_at < datetime('now', '-7 days')`
    ).all()

    for (const sd of graceExpired.results ?? []) {
      try {
        await db.prepare(
          `DELETE FROM subdomains WHERE id = ?`
        ).bind(sd.id).run()

        // Could also clean up applications, payments, etc.
        results.deleted++
      } catch (e: any) {
        results.errors.push(`Delete ${sd.id}: ${e.message}`)
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (e: any) {
    console.error('[Cron] Fatal error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}