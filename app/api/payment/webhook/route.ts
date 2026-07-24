import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/paywuz'
import { sendEmail, emailPaymentSuccess } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { notifPaymentSuccess } from '@/lib/admin-notif'
import { dispatchWebhook } from '@/lib/webhooks'

/**
 * Paywuz webhook (canonical)
 * URL di dashboard Paywuz: https://tepi.my.id/api/payment/webhook
 *
 * Payload resmi (docs paywuz):
 * { event: 'transaction.paid'|'transaction.failed'|'transaction.cancelled',
 *   data: { id, orderId, amount, status: 'success'|..., paidAt, ... }, timestamp }
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('X-Paywuz-Signature') || req.headers.get('x-paywuz-signature')

    if (!(await verifyWebhookSignature(rawBody, signature))) {
      console.error('[Paywuz Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    console.log('[Paywuz Webhook] Received:', payload.event || payload.status, payload.data?.orderId || payload.orderId || payload.order_id)

    // Support both nested {event,data} and flat body
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
      console.error('[Paywuz Webhook] Invalid orderId format:', orderId)
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }
    const subdomainId = parseInt(match[1], 10)
    const db = await getDB()

    const isPaidEvent =
      event === 'transaction.paid' ||
      statusRaw === 'success' ||
      statusRaw === 'paid' ||
      statusRaw === 'settlement'

    const isFailEvent =
      event === 'transaction.failed' ||
      event === 'transaction.cancelled' ||
      statusRaw === 'failed' ||
      statusRaw === 'cancelled'

    if (isPaidEvent) {
      const subdomain = await db.prepare(
        'SELECT * FROM subdomains WHERE id = ?'
      ).bind(subdomainId).first() as Record<string, unknown> | null

      if (!subdomain) {
        console.error('[Paywuz Webhook] Subdomain not found:', subdomainId)
        return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })
      }

      const payment = await db.prepare(
        'SELECT * FROM payments WHERE order_id = ?'
      ).bind(orderId).first() as Record<string, unknown> | null

      const isNSAddon = !!(payment && Number(payment.ns_addon_amount || 0) > 0)
      const baseAmount = payment ? Number(payment.base_amount || amount || 5000) : (amount || 5000)

      // Extend expiry: from max(now, current expiry) + 365d
      let baseDate = new Date()
      if (subdomain.expires_at) {
        const cur = new Date(String(subdomain.expires_at).replace(' ', 'T') + (String(subdomain.expires_at).includes('Z') ? '' : 'Z'))
        if (!Number.isNaN(cur.getTime()) && cur > baseDate) baseDate = cur
      }
      const newExpiry = new Date(baseDate.getTime() + 365 * 86400000)
      const expiresAt = newExpiry.toISOString().replace('T', ' ').replace(/\..*/, '')

      await db.prepare(
        `UPDATE subdomains SET plan = 'paid', status = 'active', expires_at = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(expiresAt, subdomainId).run()

      // Update payment (ignore missing optional columns)
      try {
        await db.prepare(
          `UPDATE payments SET
            status = 'success',
            paid_at = COALESCE(?, datetime('now')),
            paywuz_transaction_id = COALESCE(?, paywuz_transaction_id),
            fee = COALESCE(?, fee),
            total_payment = COALESCE(?, total_payment),
            payment_method = COALESCE(?, payment_method)
           WHERE order_id = ?`
        ).bind(paidAt, txId, fee || null, amount || null, paymentMethod, orderId).run()
      } catch (e: any) {
        console.error('[Paywuz Webhook] payment update fallback', e?.message)
        await db.prepare(
          `UPDATE payments SET status = 'success' WHERE order_id = ?`
        ).bind(orderId).run()
      }

      const user = await db.prepare(
        'SELECT id, email, full_name FROM users WHERE id = ?'
      ).bind(subdomain.user_id).first() as { id: string; email: string; full_name: string } | null

      if (user) {
        try {
          const tpl = emailPaymentSuccess(
            user.full_name || user.email,
            subdomain.name as string,
            expiresAt
          )
          await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html })
        } catch (e) {
          console.error('[Webhook] Email failed:', e)
        }

        await createNotification(
          user.id,
          'payment_confirmed',
          'Pembayaran Dikonfirmasi',
          `Subdomain ${subdomain.name}.tepi.my.id sekarang Paid hingga ${expiresAt}`,
          '/dashboard'
        )
      }

      try {
        await db.prepare(
          `INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'payment_paid', ?)`
        ).bind(
          subdomain.user_id,
          JSON.stringify({ subdomainId, orderId, amount, nsAddon: isNSAddon, expiresAt })
        ).run()
      } catch { /* optional */ }

      try {
        await dispatchWebhook(subdomain.user_id as string, 'payment.paid', {
          subdomainId,
          subdomainName: subdomain.name,
          orderId,
          amount,
          nsAddon: isNSAddon,
          expiresAt,
        })
      } catch { /* optional */ }

      try {
        notifPaymentSuccess(
          `${subdomain.name}.tepi.my.id`,
          user?.full_name || user?.email || 'User',
          amount || baseAmount,
          (payment?.invoice_number as string) || orderId,
          expiresAt
        )
      } catch { /* optional */ }

      console.log('[Paywuz Webhook] Payment processed subdomain', subdomainId, 'expires', expiresAt)
      return NextResponse.json({ received: true, plan: 'paid', expires_at: expiresAt })
    }

    if (isFailEvent) {
      try {
        await db.prepare(
          `UPDATE payments SET status = ? WHERE order_id = ?`
        ).bind(
          event === 'transaction.cancelled' || statusRaw === 'cancelled' ? 'cancelled' : 'failed',
          orderId
        ).run()
      } catch { /* ignore */ }
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true, ignored: true })
  } catch (error: any) {
    console.error('[Paywuz Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: error?.message }, { status: 500 })
  }
}
