import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/paywuz'
import { applyPaidPlan } from '@/lib/apply-paid'

/**
 * Paywuz webhook
 * URL: https://tepi.my.id/api/payment/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('X-Paywuz-Signature') || req.headers.get('x-paywuz-signature')

    const sigOk = await verifyWebhookSignature(rawBody, signature)
    if (!sigOk) {
      console.error('[Paywuz Webhook] Invalid signature', {
        hasHeader: !!signature,
        hasKey: !!process.env.PAYWUZ_API_KEY,
        bodyLen: rawBody.length,
        bodyPreview: rawBody.slice(0, 120),
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    console.log('[Paywuz Webhook] Received:', JSON.stringify(payload).slice(0, 500))

    const event = payload.event as string | undefined
    const data = payload.data || payload
    const orderId = data.orderId || data.order_id || payload.orderId || payload.order_id
    const amount = Number(data.amount ?? payload.amount ?? 0)
    const statusRaw = String(data.status || payload.status || '').toLowerCase()
    const paidAt = data.paidAt || data.paid_at || null
    const fee = Number(data.fee ?? 0)
    const paymentMethod = data.paymentMethod || data.payment_method || 'QRIS'
    const txId = data.id || payload.id || null

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }

    const match = String(orderId).match(/^tepi-(\d+)-\d+$/)
    if (!match) {
      console.error('[Paywuz Webhook] Invalid orderId:', orderId)
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }
    const subdomainId = parseInt(match[1], 10)

    const isPaidEvent =
      event === 'transaction.paid' ||
      statusRaw === 'success' ||
      statusRaw === 'paid' ||
      statusRaw === 'settlement' ||
      (!!event && String(event).includes('paid'))

    const isFailEvent =
      event === 'transaction.failed' ||
      event === 'transaction.cancelled' ||
      statusRaw === 'failed' ||
      statusRaw === 'cancelled'

    if (isPaidEvent) {
      const result = await applyPaidPlan(subdomainId, String(orderId), {
        amount, paidAt, txId, fee, paymentMethod,
      })
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 404 })
      }
      console.log('[Paywuz Webhook] Applied paid', result)
      return NextResponse.json({ received: true, ...result })
    }

    if (isFailEvent) {
      try {
        const db = await getDB()
        await db.prepare(
          `UPDATE payments SET status = ? WHERE order_id = ?`
        ).bind(
          event === 'transaction.cancelled' || statusRaw === 'cancelled' ? 'cancelled' : 'failed',
          orderId
        ).run()
      } catch { /* ignore */ }
      return NextResponse.json({ received: true })
    }

    console.log('[Paywuz Webhook] ignored event', event, statusRaw)
    return NextResponse.json({ received: true, ignored: true, event, status: statusRaw })
  } catch (error: any) {
    console.error('[Paywuz Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: error?.message }, { status: 500 })
  }
}
