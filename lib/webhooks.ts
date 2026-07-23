/**
 * Outgoing Webhook Dispatcher
 * Sends events to user-configured webhook URLs
 * Events: subdomain.created, subdomain.renewed, subdomain.expired, subdomain.suspended, subdomain.deleted, payment.paid, payment.failed
 */

import { getDB } from '@/lib/db'

export type WebhookEvent =
  | 'subdomain.created'
  | 'subdomain.renewed'
  | 'subdomain.expired'
  | 'subdomain.suspended'
  | 'subdomain.deleted'
  | 'payment.paid'
  | 'payment.failed'

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

interface WebhookSubscription {
  id: number
  user_id: string
  url: string
  secret: string
  events: string // JSON array
  active: number
}

/**
 * Get active webhook subscriptions for a user that listen to a specific event
 */
async function getSubscriptionsForEvent(userId: string, event: WebhookEvent): Promise<WebhookSubscription[]> {
  const db = await getDB()
  const subs = await db.prepare(
    `SELECT * FROM webhook_subscriptions WHERE user_id = ? AND active = 1`
  ).bind(userId).all()

  return (subs.results ?? [])
    .filter(s => {
      try {
        const events = JSON.parse(s.events as string) as string[]
        return events.includes(event)
      } catch { return false }
    }) as WebhookSubscription[]
}

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Send webhook to a single subscription
 */
async function sendWebhook(sub: WebhookSubscription, payload: WebhookPayload): Promise<boolean> {
  const body = JSON.stringify(payload)
  const signature = await generateSignature(body, sub.secret)

  try {
    const response = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tepi-Event': payload.event,
        'X-Tepi-Signature': `sha256=${signature}`,
        'X-Tepi-Timestamp': payload.timestamp,
        'User-Agent': 'tepi-webhook/1.0',
      },
      body,
    })

    // Update last triggered time
    const db = await getDB()
    await db.prepare(
      `UPDATE webhook_subscriptions SET last_triggered_at = datetime('now') WHERE id = ?`
    ).bind(sub.id).run()

    if (!response.ok) {
      console.error(`[Webhook] Failed to deliver to ${sub.url}: ${response.status} ${response.statusText}`)
      return false
    }

    return true
  } catch (error) {
    console.error(`[Webhook] Error delivering to ${sub.url}:`, error)
    return false
  }
}

/**
 * Dispatch webhook event to all matching subscriptions for a user
 */
export async function dispatchWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getSubscriptionsForEvent(userId, event)

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  const results = await Promise.allSettled(
    subscriptions.map(sub => sendWebhook(sub, payload))
  )

  let sent = 0
  let failed = 0

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) sent++
    else failed++
  }

  console.log(`[Webhook] Event ${event} for user ${userId}: ${sent} sent, ${failed} failed`)
  return { sent, failed }
}

/**
 * Create a new webhook subscription
 */
export async function createWebhookSubscription(
  userId: string,
  url: string,
  events: WebhookEvent[],
  secret?: string
): Promise<{ id: number; secret: string }> {
  const webhookSecret = secret || crypto.randomUUID().replace(/-/g, '')

  const db = await getDB()
  const result = await db.prepare(
    `INSERT INTO webhook_subscriptions (user_id, url, secret, events, active)
     VALUES (?, ?, ?, ?, 1)`
  ).bind(userId, url, webhookSecret, JSON.stringify(events)).run()

  return { id: result.meta.last_row_id as number, secret: webhookSecret }
}

/**
 * List webhook subscriptions for a user (without secrets)
 */
export async function listWebhookSubscriptions(userId: string): Promise<Omit<WebhookSubscription, 'secret'>[]> {
  const db = await getDB()
  const subs = await db.prepare(
    `SELECT id, user_id, url, events, active, created_at, last_triggered_at
     FROM webhook_subscriptions WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(userId).all()

  return (subs.results ?? []).map(({ secret, ...rest }) => rest) as Omit<WebhookSubscription, 'secret'>[]
}

/**
 * Delete a webhook subscription
 */
export async function deleteWebhookSubscription(userId: string, id: number): Promise<boolean> {
  const db = await getDB()
  const result = await db.prepare(
    `DELETE FROM webhook_subscriptions WHERE id = ? AND user_id = ?`
  ).bind(id, userId).run()

  return (result.changes ?? 0) > 0
}