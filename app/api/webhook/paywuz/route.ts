import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { sendEmail, emailPaymentSuccess } from '@/lib/email'
import { notifPaymentSuccess } from '@/lib/admin-notif'

/**
 * Paywuz Webhook — dipanggil Paywuz setelah pembayaran sukses/gagal
 * Endpoint: POST /api/webhook/paywuz
 */
export async function POST(req: Request) {
  const body: any = await req.json()

  // Ambil signature dari headers
  const signature = req.headers.get('x-paywuz-signature') || ''

  // Verify signature
  const expectedSig = await generateSignature(body, process.env.PAYWUZ_API_KEY || '')
  if (signature !== expectedSig && process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const db = await getDB()

  // Update payment record
  const { id, order_id, status, amount, fee, payment_method } = body

  if (order_id) {
    await db.prepare(
      `UPDATE payments SET
        paywuz_transaction_id = ?,
        fee = ?,
        total_payment = ?,
        payment_method = ?,
        status = ?,
        paid_at = CASE WHEN ? = 'success' THEN datetime('now') ELSE paid_at END
       WHERE order_id = ?`
    ).bind(id, fee || 0, amount, payment_method || 'QRIS', status, status, order_id).run()

    if (status === 'success') {
      // Extend subdomain
      const payment = await db.prepare(
        'SELECT * FROM payments WHERE order_id = ?'
      ).bind(order_id).first() as Record<string, unknown> | null

      if (payment && payment.subdomain_id) {
        const newExpiry = new Date()
        newExpiry.setDate(newExpiry.getDate() + 365)
        const expiresAt = newExpiry.toISOString().replace('T', ' ').replace(/\..*/, '')

        await db.prepare(
          `UPDATE subdomains SET plan = 'paid', expires_at = ?, status = 'active' WHERE id = ?`
        ).bind(expiresAt, payment.subdomain_id).run()

        // Send email
        const subdomain = await db.prepare(
          `SELECT s.*, u.email, u.full_name FROM subdomains s
           JOIN users u ON u.id = s.user_id WHERE s.id = ?`
        ).bind(payment.subdomain_id).first() as Record<string, unknown> | null

        if (subdomain) {
          try {
            await sendEmail(emailPaymentSuccess(
              (subdomain.full_name as string) || (subdomain.email as string),
              `${subdomain.name as string}.tepi.my.id`
            ))
          } catch { /* email optional */ }

          // Push notif admin
          notifPaymentSuccess(
            `${subdomain.name as string}.tepi.my.id`,
            (subdomain.full_name as string) || (subdomain.email as string) || 'User',
            payment.amount as number || 5000,
            payment.invoice_number as string || order_id,
            expiresAt,
          )
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}

async function generateSignature(body: any, key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(body) + key)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}
