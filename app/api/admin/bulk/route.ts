import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'
import { deleteDNSRecord } from '@/lib/cloudflare-dns'
import { createSubdomainRenewalOrder } from '@/lib/paywuz'
import { createDNSRecord } from '@/lib/cloudflare-dns'
import { safeJsonParse } from '@/lib/safe-json'

export async function POST(req: NextRequest) {
  let user
  try { user = await requireAdmin() } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { action, subdomainIds, ns_records } = body

  if (!action || !Array.isArray(subdomainIds) || subdomainIds.length === 0) {
    return NextResponse.json({ error: 'Action dan subdomainIds wajib diisi' }, { status: 400 })
  }

  const validActions = ['renew', 'suspend', 'unsuspend', 'delete', 'ns_update']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  }

  const db = await getDB()
  const placeholders = subdomainIds.map(() => '?').join(',')
  const subs = await db.prepare(
    `SELECT * FROM subdomains WHERE id IN (${placeholders})`
  ).bind(...subdomainIds).all()

  if (!subs.results || subs.results.length === 0) {
    return NextResponse.json({ error: 'Subdomain tidak ditemukan' }, { status: 404 })
  }

  let successCount = 0
  const errors: Array<{ id: number; error: string }> = []

  for (const sub of subs.results as any[]) {
    try {
      switch (action) {
        case 'renew': {
          if (sub.plan !== 'paid') {
            errors.push({ id: sub.id, error: 'Hanya subdomain paid yang bisa diperpanjang' })
            continue
          }
          const nsAddon = sub.ns_addon === 1
          const amount = nsAddon ? 6000 : 5000
          const orderId = `tepi-${sub.id}-${Date.now()}`
          try {
            await db.prepare(
              `INSERT INTO payments (user_id, subdomain_id, order_id, amount, status) VALUES (?, ?, ?, ?, 'pending')`
            ).bind(sub.user_id, sub.id, orderId, amount).run()
          } catch { /* ignore insert fail */ }
          const result = await createSubdomainRenewalOrder({
            subdomainId: Number(sub.id),
            subdomainName: sub.name,
            userId: sub.user_id,
            amount,
            orderId,
          })
          if (!result.success) throw new Error(result.error)
          successCount++
          break
        }

        case 'suspend': {
          // Delete DNS records
          if (sub.cf_record_id) await deleteDNSRecord(sub.cf_record_id)
          if (sub.ns_addon && sub.ns_record_ids) {
            const nsIds = safeJsonParse(sub.ns_record_ids) || []
            for (const nsId of nsIds) await deleteDNSRecord(nsId)
          }
          await db.prepare(
            `UPDATE subdomains SET status = 'suspended' WHERE id = ?`
          ).bind(sub.id).run()
          successCount++
          break
        }

        case 'unsuspend': {
          // Recreate DNS records
          const dnsRecords = safeJsonParse(sub.dns_records) || [{ type: sub.target_type, value: sub.target_value }]
          const createdRecords: any[] = []
          for (const rec of dnsRecords) {
            const dnsResult = await createDNSRecord({
              type: rec.type as 'CNAME' | 'A' | 'TXT',
              name: `${sub.name}.tepi.my.id`,
              content: rec.value,
              proxied: true,
            })
            if (!dnsResult.success) throw new Error(dnsResult.error)
            createdRecords.push({ type: rec.type, value: rec.value, cf_record_id: dnsResult.result?.id })
          }

          const nsIds: string[] = []
          if (sub.ns_addon && sub.ns_records) {
            const nsRecords = safeJsonParse(sub.ns_records) || []
            for (const ns of nsRecords) {
              const dnsResult = await createDNSRecord({
                type: 'NS',
                name: `${sub.name}.tepi.my.id`,
                content: ns,
                proxied: false,
              })
              if (!dnsResult.success) throw new Error(dnsResult.error)
              nsIds.push(dnsResult.result?.id)
            }
          }

          await db.prepare(
            `UPDATE subdomains SET status = 'active', cf_record_id = ?, ns_record_ids = ? WHERE id = ?`
          ).bind(
            createdRecords[0]?.cf_record_id ?? null,
            nsIds.length > 0 ? JSON.stringify(nsIds) : null,
            sub.id
          ).run()
          successCount++
          break
        }

        case 'delete': {
          if (sub.cf_record_id) await deleteDNSRecord(sub.cf_record_id)
          if (sub.ns_addon && sub.ns_record_ids) {
            const nsIds = safeJsonParse(sub.ns_record_ids) || []
            for (const nsId of nsIds) await deleteDNSRecord(nsId)
          }
          await db.prepare(`DELETE FROM subdomains WHERE id = ?`).bind(sub.id).run()
          await db.prepare(`INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'delete', ?)`)
            .bind(user.id, JSON.stringify({ subdomainId: sub.id, subdomain: sub.name })).run()
          successCount++
          break
        }

        case 'ns_update': {
          if (!ns_records || ns_records.length !== 4) {
            errors.push({ id: sub.id, error: 'Harus 4 nameserver' })
            continue
          }

          // Delete old NS records
          if (sub.ns_addon && sub.ns_record_ids) {
            const oldNsIds = safeJsonParse(sub.ns_record_ids) || []
            for (const nsId of oldNsIds) await deleteDNSRecord(nsId)
          }

          // Create new NS records
          const newNsIds: string[] = []
          for (const ns of ns_records) {
            const dnsResult = await createDNSRecord({
              type: 'NS',
              name: `${sub.name}.tepi.my.id`,
              content: ns,
              proxied: false,
            })
            if (!dnsResult.success) throw new Error(dnsResult.error)
            newNsIds.push(dnsResult.result?.id)
          }

          await db.prepare(
            `UPDATE subdomains SET ns_records = ?, ns_record_ids = ? WHERE id = ?`
          ).bind(JSON.stringify(ns_records), JSON.stringify(newNsIds), sub.id).run()
          successCount++
          break
        }
      }
    } catch (err: any) {
      errors.push({ id: sub.id, error: err.message })
    }
  }

  return NextResponse.json({ successCount, errors })
}