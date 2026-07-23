import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { generateInvoiceNumber } from '@/lib/invoice'
import { createSubdomainRenewalOrder } from '@/lib/paywuz'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subdomainId = searchParams.get('subdomain_id')
  const nsAddon = searchParams.get('ns_addon') === '1'

  if (!subdomainId) return NextResponse.json({ error: 'subdomain_id required' }, { status: 400 })

  const db = await getDB()
  const subdomain = await db.prepare(
    'SELECT * FROM subdomains WHERE id = ? AND user_id = ?'
  ).bind(subdomainId, user.id).first() as Record<string, unknown> | null

  if (!subdomain) return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })

  const BASE_PRICE = 5000
  const NS_ADDON_PRICE = 1000
  const amount = nsAddon ? BASE_PRICE + NS_ADDON_PRICE : BASE_PRICE

  const orderId = `tepi-${subdomainId}-${Date.now()}`
  const invoiceNumber = generateInvoiceNumber()

  await db.prepare(
    `INSERT INTO payments (user_id, subdomain_id, order_id, invoice_number, amount, status, base_amount, ns_addon_amount)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(user.id, subdomainId, orderId, invoiceNumber, amount, BASE_PRICE, nsAddon ? NS_ADDON_PRICE : 0).run()

  try {
    const result = await createSubdomainRenewalOrder({
      subdomainId: Number(subdomainId),
      subdomainName: subdomain.name as string,
      userId: user.id,
      amount,
      description: nsAddon ? `Renewal + NS Add-on (${subdomain.name}.tepi.my.id)` : `Renewal (${subdomain.name}.tepi.my.id)`,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      qr_url: result.data.paymentUrl,
      qr_image: result.data.paymentNumber,
      order_id: orderId,
      invoice_number: invoiceNumber,
      expires_at: result.data.expiresAt,
    })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat pembayaran. Coba lagi.' }, { status: 500 })
  }
}