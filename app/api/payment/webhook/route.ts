import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/paywuz'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('X-Paywuz-Signature')

    if (!await verifyWebhookSignature(rawBody, signature)) {
      console.error('[Paywuz Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    console.log('[Paywuz Webhook] Received:', payload.event, payload.data.orderId)

    const { event, data } = payload
    const { orderId, amount, status, paidAt } = data

    // Parse orderId: tepi-{subdomainId}-{timestamp}
    const match = orderId.match(/^tepi-(\d+)-\d+$/)
    if (!match) {
      console.error('[Paywuz Webhook] Invalid orderId format:', orderId)
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 })
    }

    const subdomainId = parseInt(match[1], 10)
    const db = await getDB()

    if (event === 'transaction.paid' && status === 'paid') {
      // Get subdomain info
      const subdomain = await db.prepare(
        'SELECT * FROM subdomains WHERE id = ?'
      ).bind(subdomainId).first() as Record<string, unknown> | null

      if (!subdomain) {
        console.error('[Paywuz Webhook] Subdomain not found:', subdomainId)
        return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })
      }

      // Get payment record to know if NS add-on was included
      const payment = await db.prepare(
        'SELECT * FROM payments WHERE order_id = ?'
      ).bind(orderId).first() as Record<string, unknown> | null

      const isNSAddon = payment && (payment.ns_addon_amount as number) > 0
      const baseAmount = payment ? (payment.base_amount as number) : 5000

      if (subdomain.plan === 'paid' && subdomain.expires_at) {
        // Already paid - extend 1 year from current expiry
        const currentExpiry = new Date((subdomain.expires_at as string).replace(' ', 'T') + 'Z')
        const newExpiry = new Date(currentExpiry.getTime() + 365 * 86400000)
        const expiresAt = newExpiry.toISOString().replace('T', ' ').replace(/\..*/, '')

        await db.prepare(
          'UPDATE subdomains SET expires_at = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind(expiresAt, subdomainId).run()
      } else {
        // First time paid
        const expiresAt = new Date(Date.now() + 365 * 86400000)
          .toISOString().replace('T', ' ').replace(/\..*/, '')

        await db.prepare(
          'UPDATE subdomains SET plan = ?, expires_at = ?, auto_renew = 1, updated_at = datetime("now") WHERE id = ?'
        ).bind('paid', expiresAt, subdomainId).run()
      }

      // Update payment record with receipt info
      const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing/receipt/${orderId}`
      await db.prepare(
        `UPDATE payments SET 
          status = 'paid', 
          paid_at = datetime("now"), 
          base_amount = ?, 
          ns_addon_amount = ?,
          receipt_sent = 1,
          receipt_url = ?
         WHERE order_id = ?`
      ).bind(baseAmount, isNSAddon ? 1000 : 0, receiptUrl, orderId).run()

      // Get user for notification
      const user = await db.prepare(
        'SELECT email, full_name FROM users WHERE id = ?'
      ).bind(subdomain.user_id).first() as { email: string; full_name: string } | null

      if (user) {
        // Send email notification
        try {
          await sendEmail({
            to: user.email,
            subject: 'Pembayaran Berhasil - Subdomain Aktif 1 Tahun',
            html: `
              <p>Halo ${user.full_name || user.email},</p>
              <p>Pembayaran untuk <strong>${subdomain.name}.tepi.my.id</strong> telah dikonfirmasi.</p>
              <p>Subdomain kamu sekarang <strong>Paid</strong> dan aktif hingga <strong>${new Date(subdomain.expires_at as string).toLocaleDateString('id-ID')}</strong>.</p>
              <p><a href="${receiptUrl}">Unduh Invoice/Receipt</a></p>
              <p>Terima kasih telah menggunakan tepi.my.id!</p>
            `
          })
        } catch (e) { console.error('[Webhook] Email failed:', e) }

        // In-app notification
        await createNotification(
          subdomain.user_id as string,
          'payment_confirmed',
          'Pembayaran Dikonfirmasi',
          `Subdomain ${subdomain.name}.tepi.my.id sekarang Paid (1 tahun)`,
          '/dashboard'
        )
      }

      // Log activity
      await db.prepare(
        `INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'payment_paid', ?)`
      ).bind(subdomain.user_id, JSON.stringify({ subdomainId, orderId, amount, nsAddon: isNSAddon })).run()

      console.log('[Paywuz Webhook] Payment processed for subdomain:', subdomainId)
    }

    else if (event === 'transaction.failed' || event === 'transaction.cancelled') {
      // Update payment record
      await db.prepare(
        `UPDATE payments SET status = ? WHERE order_id = ?`
      ).bind(event === 'transaction.failed' ? 'failed' : 'cancelled', orderId).run()

      console.log('[Paywuz Webhook] Transaction failed/cancelled:', orderId)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('[Paywuz Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}