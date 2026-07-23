import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { createWebhookSubscription, getWebhookSubscriptions, deleteWebhookSubscription, dispatchWebhook } from '@/lib/webhooks'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subs = await getWebhookSubscriptions(user.id)
  // Don't return secrets
  const safeSubs = subs.map(({ secret, ...rest }) => rest)
  return NextResponse.json({ subscriptions: safeSubs })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { url, events } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 })
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'At least one event required' }, { status: 400 })
  }

  // Validate events
  const validEvents = [
    'subdomain.created', 'subdomain.renewed', 'subdomain.expired',
    'subdomain.suspended', 'subdomain.deleted', 'payment.paid', 'payment.failed'
  ]
  const invalid = events.filter(e => !validEvents.includes(e))
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Invalid events: ${invalid.join(', ')}` }, { status: 400 })
  }

  const { id, secret } = await createWebhookSubscription(user.id, url, events)

  return NextResponse.json({
    id,
    url,
    events,
    secret, // Only shown once!
    createdAt: new Date().toISOString(),
  })
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 })
  }

  const deleted = await deleteWebhookSubscription(user.id, parseInt(id, 10))
  if (!deleted) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}