import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { createSubdomainRenewalOrder } from '@/lib/paywuz'
import { generateInvoiceNumber } from '@/lib/invoice'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, subdomainIds } = body

  if (!action || !Array.isArray(subdomainIds) || subdomainIds.length === 0) {
    return NextResponse.json({ error: 'Action dan subdomainIds wajib diisi' }, { status: 400 })
  }
  if (action !== 'renew') {
    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  }

  const db = await getDB()
  const placeholders = subdomainIds.map(() => '?').join(',')
  const subs = await db.prepare(
    `SELECT * FROM subdomains WHERE id IN (${placeholders}) AND user_id = ?`
  ).bind(...subdomainIds, user.id).all()

  if (!subs.results || subs.results.length === 0) {
    return NextResponse.json({ error: 'Subdomain tidak ditemukan' }, { status: 404 })
  }

  const results: Array<{ id: number; success: boolean; error?: string; orderId?: string; paymentUrl?: string }> = []

  for (const sub of subs.results as any[]) {
    try {
      if (sub.plan !== 'paid') {
        results.push({ id: sub.id, success: false, error: 'Hanya subdomain paid yang bisa bulk renew' })
        continue
      }
      const nsAddon = sub.ns_addon === 1
      const amount = nsAddon ? 6000 : 5000
      const orderId = `tepi-${sub.id}-${Date.now()}`
      const invoiceNumber = generateInvoiceNumber()
      try {
        await db.prepare(
          `INSERT INTO payments (user_id, subdomain_id, order_id, invoice_number, amount, status, base_amount, ns_addon_amount)
           VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
        ).bind(user.id, sub.id, orderId, invoiceNumber, amount, 5000, nsAddon ? 1000 : 0).run()
      } catch {
        await db.prepare(
          `INSERT INTO payments (user_id, subdomain_id, order_id, amount, status) VALUES (?, ?, ?, ?, 'pending')`
        ).bind(user.id, sub.id, orderId, amount).run()
      }
      const result = await createSubdomainRenewalOrder({
        subdomainId: Number(sub.id),
        subdomainName: sub.name,
        userId: user.id,
        amount,
        orderId,
      })
      if (!result.success) {
        results.push({ id: sub.id, success: false, error: result.error })
        continue
      }
      results.push({ id: sub.id, success: true, orderId, paymentUrl: result.data.paymentUrl })
    } catch (err: any) {
      results.push({ id: sub.id, success: false, error: err.message })
    }
  }

  return NextResponse.json({ results, successCount: results.filter(r => r.success).length })
}
