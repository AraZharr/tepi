import { getDB } from '@/lib/db'
import { sendEmail, emailPaymentSuccess } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { notifPaymentSuccess } from '@/lib/admin-notif'
import { dispatchWebhook } from '@/lib/webhooks'

/** Apply paid plan for subdomain. Idempotent-ish (re-extends +365d from max(now, expiry)). */
export async function applyPaidPlan(
  subdomainId: number,
  orderId: string,
  opts?: {
    amount?: number
    paidAt?: string | null
    txId?: string | null
    fee?: number
    paymentMethod?: string
  }
) {
  const db = await getDB()
  const subdomain = await db.prepare(
    'SELECT * FROM subdomains WHERE id = ?'
  ).bind(subdomainId).first() as Record<string, unknown> | null

  if (!subdomain) return { ok: false as const, error: 'Subdomain not found' }

  const payment = await db.prepare(
    'SELECT * FROM payments WHERE order_id = ?'
  ).bind(orderId).first() as Record<string, unknown> | null

  const isNSAddon = !!(payment && Number(payment.ns_addon_amount || 0) > 0)
  const amount = opts?.amount ?? Number(payment?.amount || 5000)

  let baseDate = new Date()
  if (subdomain.expires_at) {
    const raw = String(subdomain.expires_at).replace(' ', 'T')
    const cur = new Date(raw.endsWith('Z') ? raw : raw + 'Z')
    if (!Number.isNaN(cur.getTime()) && cur > baseDate) baseDate = cur
  }
  const expiresAt = new Date(baseDate.getTime() + 365 * 86400000)
    .toISOString().replace('T', ' ').replace(/\..*/, '')

  // No updated_at — column may not exist on prod D1
  await db.prepare(
    `UPDATE subdomains SET plan = 'paid', status = 'active', expires_at = ? WHERE id = ?`
  ).bind(expiresAt, subdomainId).run()

  try {
    await db.prepare(
      `UPDATE payments SET status = 'success', paid_at = datetime('now') WHERE order_id = ?`
    ).bind(orderId).run()
  } catch {
    try {
      await db.prepare(`UPDATE payments SET status = 'success' WHERE order_id = ?`).bind(orderId).run()
    } catch { /* ignore */ }
  }

  if (opts?.txId || opts?.fee != null) {
    try {
      await db.prepare(
        `UPDATE payments SET
          paywuz_transaction_id = COALESCE(?, paywuz_transaction_id),
          fee = COALESCE(?, fee),
          payment_method = COALESCE(?, payment_method)
         WHERE order_id = ?`
      ).bind(opts.txId || null, opts.fee ?? null, opts.paymentMethod || null, orderId).run()
    } catch { /* optional cols */ }
  }

  const user = await db.prepare(
    'SELECT id, email, full_name FROM users WHERE id = ?'
  ).bind(subdomain.user_id).first() as { id: string; email: string; full_name: string } | null

  if (user) {
    try {
      const tpl = emailPaymentSuccess(user.full_name || user.email, subdomain.name as string, expiresAt)
      await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html })
    } catch (e) {
      console.error('[applyPaidPlan] email', e)
    }
    try {
      await createNotification(
        user.id,
        'payment_confirmed',
        'Pembayaran Dikonfirmasi',
        `Subdomain ${subdomain.name}.tepi.my.id Paid hingga ${expiresAt}`,
        '/dashboard'
      )
    } catch { /* ignore */ }
  }

  try {
    await db.prepare(
      `INSERT INTO activity_logs (user_id, action, detail) VALUES (?, 'payment_paid', ?)`
    ).bind(subdomain.user_id, JSON.stringify({ subdomainId, orderId, amount, nsAddon: isNSAddon, expiresAt })).run()
  } catch { /* ignore */ }

  try {
    await dispatchWebhook(subdomain.user_id as string, 'payment.paid', {
      subdomainId, subdomainName: subdomain.name, orderId, amount, nsAddon: isNSAddon, expiresAt,
    })
  } catch { /* ignore */ }

  try {
    notifPaymentSuccess(
      `${subdomain.name}.tepi.my.id`,
      user?.full_name || user?.email || 'User',
      amount,
      (payment?.invoice_number as string) || orderId,
      expiresAt
    )
  } catch { /* ignore */ }

  return {
    ok: true as const,
    subdomain: subdomain.name as string,
    plan: 'paid' as const,
    expires_at: expiresAt,
    was_plan: subdomain.plan as string,
  }
}
