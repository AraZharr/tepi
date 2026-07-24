import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'
import { getTransactionStatus } from '@/lib/paywuz'

/**
 * POST { order_id } — cek status Paywuz + apply paid ke subdomain (manual reconcile).
 * Untuk kasus bayar sukses tapi webhook miss.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any = {}
  try { body = await req.json() } catch { /* empty */ }
  const orderId = String(body.order_id || body.orderId || '')
  if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const match = orderId.match(/^tepi-(\d+)-\d+$/)
  if (!match) return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 })
  const subdomainId = parseInt(match[1], 10)

  const db = await getDB()
  const payStatus = await getTransactionStatus(orderId)
  if (!payStatus.success) {
    return NextResponse.json({ error: payStatus.error, orderId }, { status: 502 })
  }

  const st = String(payStatus.data.status || '').toLowerCase()
  if (st !== 'success' && st !== 'paid') {
    return NextResponse.json({
      error: `Paywuz status bukan paid: ${payStatus.data.status}`,
      status: payStatus.data.status,
    }, { status: 400 })
  }

  const subdomain = await db.prepare('SELECT * FROM subdomains WHERE id = ?').bind(subdomainId).first() as any
  if (!subdomain) return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })

  let baseDate = new Date()
  if (subdomain.expires_at) {
    const cur = new Date(String(subdomain.expires_at).replace(' ', 'T') + 'Z')
    if (!Number.isNaN(cur.getTime()) && cur > baseDate) baseDate = cur
  }
  const expiresAt = new Date(baseDate.getTime() + 365 * 86400000)
    .toISOString().replace('T', ' ').replace(/\..*/, '')

  await db.prepare(
    `UPDATE subdomains SET plan = 'paid', status = 'active', expires_at = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(expiresAt, subdomainId).run()

  try {
    await db.prepare(
      `UPDATE payments SET status = 'success', paid_at = datetime('now') WHERE order_id = ?`
    ).bind(orderId).run()
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    subdomain: subdomain.name,
    plan: 'paid',
    expires_at: expiresAt,
    paywuz: payStatus.data.status,
  })
}
