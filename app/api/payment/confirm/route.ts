import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { getTransactionStatus } from '@/lib/paywuz'
import { applyPaidPlan } from '@/lib/apply-paid'

/**
 * GET ?order=tepi-2-...
 * User return dari Paywuz → client panggil ini.
 * Cek status di Paywuz API; kalau success → apply paid (backup webhook).
 */
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order') || searchParams.get('order_id') || ''
  if (!orderId) return NextResponse.json({ error: 'order required' }, { status: 400 })

  const match = orderId.match(/^tepi-(\d+)-\d+$/)
  if (!match) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  const subdomainId = parseInt(match[1], 10)

  const db = await getDB()
  const sub = await db.prepare(
    'SELECT * FROM subdomains WHERE id = ? AND user_id = ?'
  ).bind(subdomainId, user.id).first() as Record<string, unknown> | null

  if (!sub) return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })

  // Already paid with long expiry? still re-check Paywuz if plan free
  if (sub.plan === 'paid') {
    return NextResponse.json({
      success: true,
      already: true,
      plan: 'paid',
      expires_at: sub.expires_at,
      subdomain: sub.name,
    })
  }

  const payStatus = await getTransactionStatus(orderId)
  if (!payStatus.success) {
    return NextResponse.json({
      error: 'Gagal cek Paywuz: ' + payStatus.error,
      plan: sub.plan,
    }, { status: 502 })
  }

  const st = String(payStatus.data.status || '').toLowerCase()
  if (st !== 'success' && st !== 'paid') {
    return NextResponse.json({
      error: `Status Paywuz: ${payStatus.data.status}`,
      status: payStatus.data.status,
      plan: sub.plan,
    }, { status: 400 })
  }

  const result = await applyPaidPlan(subdomainId, orderId, {
    amount: payStatus.data.amount,
    paidAt: payStatus.data.paidAt,
    txId: payStatus.data.id,
    paymentMethod: payStatus.data.paymentMethod,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, source: 'confirm', ...result })
}
