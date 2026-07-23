import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { deleteDNSRecord } from '@/lib/cloudflare-dns'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

export async function DELETE(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subdomainId = searchParams.get('id')
  if (!subdomainId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = await getDB()

  // Verify ownership
  const subdomain = await db.prepare(
    'SELECT cf_record_id, ns_addon, ns_records, name FROM subdomains WHERE id = ? AND user_id = ?'
  ).bind(subdomainId, user.id).first() as Record<string, unknown> | null

  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })
  }

  // Delete DNS records
  if (subdomain.cf_record_id) {
    await deleteDNSRecord(subdomain.cf_record_id as string)
  }

  // Delete NS records (need to query by name since we don't store NS record IDs)
  if (subdomain.ns_addon && subdomain.ns_records) {
    const nsRecords = JSON.parse(subdomain.ns_records as string) as string[]
    for (const ns of nsRecords) {
      // Query Cloudflare for NS records matching this subdomain
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/dns_records?type=NS&name=${subdomain.name}.tepi.my.id`,
          { headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, 'Content-Type': 'application/json' } }
        )
        const data = await res.json() as { success: boolean; result?: { id: string; content: string }[] }
        if (data.success && data.result) {
          for (const record of data.result) {
            if (nsRecords.includes(record.content)) {
              await deleteDNSRecord(record.id)
            }
          }
        }
      } catch (e) {
        console.error('[User Delete] NS cleanup failed:', e)
      }
    }
  }

  // Delete from DB
  await db.prepare('DELETE FROM subdomains WHERE id = ?').bind(subdomainId).run()

  // Notify
  await createNotification(
    user.id,
    'subdomain_deleted',
    'Subdomain Dihapus',
    `Subdomain ${subdomain.name}.tepi.my.id telah dihapus beserta DNS records-nya.`,
    '/dashboard'
  )

  return NextResponse.json({ success: true })
}