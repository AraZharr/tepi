import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'
import { getTransactionStatus } from '@/lib/paywuz'
import { applyPaidPlan } from '@/lib/apply-paid'

/**
 * POST { order_id } — admin force-apply paid from Paywuz status
 * POST { subdomain_id, force: true } — admin force paid without Paywuz (manual)
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
  const subdomainIdRaw = body.subdomain_id || body.subdomainId
  const force = !!body.force

  // Manual force by subdomain id (no Paywuz check) — for already-paid stuck free
  if (force && subdomainIdRaw && !orderId) {
    const subdomainId = Number(subdomainIdRaw)
    const fakeOrder = `tepi-${subdomainId}-${Date.now()}`
    const result = await applyPaidPlan(subdomainId, fakeOrder, { amount: 5000 })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })
    return NextResponse.json({ success: true, source: 'force', ...result })
  }

  if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const match = orderId.match(/^tepi-(\d+)-\d+$/)
  if (!match) return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 })
  const subdomainId = parseInt(match[1], 10)

  if (force) {
    const result = await applyPaidPlan(subdomainId, orderId, { amount: 5000 })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })
    return NextResponse.json({ success: true, source: 'force-order', ...result })
  }

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

  const result = await applyPaidPlan(subdomainId, orderId, {
    amount: payStatus.data.amount,
    paidAt: payStatus.data.paidAt,
    txId: payStatus.data.id,
    paymentMethod: payStatus.data.paymentMethod,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

  return NextResponse.json({ success: true, source: 'paywuz', paywuz: payStatus.data.status, ...result })
}

/** GET — list recent payments + subdomain plan (debug) */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const db = await getDB()
  const payments = await db.prepare(
    `SELECT p.*, s.name as subdomain_name, s.plan, s.expires_at
     FROM payments p LEFT JOIN subdomains s ON s.id = p.subdomain_id
     ORDER BY p.id DESC LIMIT 20`
  ).all()
  return NextResponse.json({ payments: payments.results || [] })
}
