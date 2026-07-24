import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { generateInvoiceNumber } from '@/lib/invoice'
import { createSubdomainRenewalOrder } from '@/lib/paywuz'

async function insertPayment(
  db: Awaited<ReturnType<typeof getDB>>,
  row: {
    userId: string
    subdomainId: string
    orderId: string
    invoiceNumber: string
    amount: number
    base: number
    ns: number
  },
  steps: string[]
) {
  // Try richest → leanest column sets until one works (prod schema drift)
  const attempts: Array<{ label: string; sql: string; binds: unknown[] }> = [
    {
      label: 'full',
      sql: `INSERT INTO payments (user_id, subdomain_id, order_id, invoice_number, amount, status, base_amount, ns_addon_amount)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      binds: [row.userId, row.subdomainId, row.orderId, row.invoiceNumber, row.amount, row.base, row.ns],
    },
    {
      label: 'with-invoice',
      sql: `INSERT INTO payments (user_id, subdomain_id, order_id, invoice_number, amount, status)
            VALUES (?, ?, ?, ?, ?, 'pending')`,
      binds: [row.userId, row.subdomainId, row.orderId, row.invoiceNumber, row.amount],
    },
    {
      label: 'minimal',
      sql: `INSERT INTO payments (user_id, subdomain_id, order_id, amount, status)
            VALUES (?, ?, ?, ?, 'pending')`,
      binds: [row.userId, row.subdomainId, row.orderId, row.amount],
    },
  ]

  let lastErr: unknown
  for (const a of attempts) {
    try {
      await db.prepare(a.sql).bind(...a.binds).run()
      steps.push('payment-insert:' + a.label)
      return
    } catch (e) {
      lastErr = e
      steps.push('payment-insert-fail:' + a.label + ':' + ((e as Error)?.message || e))
    }
  }
  throw lastErr
}

async function createPayment(userId: string, subdomainId: string, nsAddon: boolean) {
  const steps: string[] = []
  try {
    steps.push('check-key')
    if (!process.env.PAYWUZ_API_KEY) {
      return NextResponse.json({
        error: 'Pembayaran belum dikonfigurasi (PAYWUZ_API_KEY kosong)',
        debug: { steps },
      }, { status: 500 })
    }

    steps.push('db')
    const db = await getDB()
    const subdomain = await db.prepare(
      'SELECT * FROM subdomains WHERE id = ? AND user_id = ?'
    ).bind(subdomainId, userId).first() as Record<string, unknown> | null

    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain not found', debug: { steps } }, { status: 404 })
    }
    steps.push('subdomain-ok:' + String(subdomain.name))

    const BASE_PRICE = 5000
    const NS_ADDON_PRICE = 1000
    const amount = nsAddon ? BASE_PRICE + NS_ADDON_PRICE : BASE_PRICE
    const orderId = `tepi-${subdomainId}-${Date.now()}`
    const invoiceNumber = generateInvoiceNumber()
    steps.push('order:' + orderId)

    await insertPayment(db, {
      userId,
      subdomainId,
      orderId,
      invoiceNumber,
      amount,
      base: BASE_PRICE,
      ns: nsAddon ? NS_ADDON_PRICE : 0,
    }, steps)

    steps.push('paywuz-create')
    const result = await createSubdomainRenewalOrder({
      subdomainId: Number(subdomainId),
      subdomainName: subdomain.name as string,
      userId,
      amount,
      description: nsAddon
        ? `Renewal + NS Add-on (${subdomain.name}.tepi.my.id)`
        : `Renewal (${subdomain.name}.tepi.my.id)`,
    })

    if (!result.success) {
      console.error('[payment/create] Paywuz fail', result.error, steps)
      return NextResponse.json({
        error: result.error || 'Paywuz gagal membuat transaksi',
        debug: { steps, provider: 'paywuz' },
      }, { status: 500 })
    }

    steps.push('ok')
    const payUrl = result.data.paymentUrl
    if (!payUrl) {
      return NextResponse.json({
        error: 'Paywuz tidak mengembalikan paymentUrl',
        debug: { steps, tx: result.data },
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      checkout_url: payUrl,
      qr_url: payUrl,
      qr_image: result.data.paymentNumber,
      order_id: orderId,
      invoice_number: invoiceNumber,
      expires_at: result.data.expiresAt,
      debug: { steps },
    })
  } catch (err: any) {
    console.error('[payment/create] Unhandled', err?.message, err?.stack, steps)
    return NextResponse.json({
      error: err?.message || 'Gagal membuat pembayaran. Coba lagi.',
      debug: { steps, stack: err?.stack?.split('\n').slice(0, 4) },
    }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subdomainId = searchParams.get('subdomain_id')
  const nsAddon = searchParams.get('ns_addon') === '1'
  if (!subdomainId) return NextResponse.json({ error: 'subdomain_id required' }, { status: 400 })
  return createPayment(user.id, subdomainId, nsAddon)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { /* empty */ }
  const subdomainId = String(body.subdomain_id || '')
  const nsAddon = !!body.ns_addon
  if (!subdomainId) return NextResponse.json({ error: 'subdomain_id required' }, { status: 400 })
  return createPayment(user.id, subdomainId, nsAddon)
}
