import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { generateInvoiceNumber } from '@/lib/invoice'
import { createPaywuzOrder } from '@/lib/paywuz'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subdomainId = searchParams.get('subdomain_id')
  if (!subdomainId) return NextResponse.json({ error: 'subdomain_id required' }, { status: 400 })

  const db = await getDB()
  const subdomain = await db.prepare(
    'SELECT * FROM subdomains WHERE id = ? AND user_id = ?'
  ).bind(subdomainId, user.id).first() as Record<string, unknown> | null

  if (!subdomain) return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })

  const orderId = `TEPI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const invoiceNumber = generateInvoiceNumber()

  await db.prepare(
    `INSERT INTO payments (user_id, subdomain_id, order_id, invoice_number, amount, status)
     VALUES (?, ?, ?, ?, 5000, 'pending')`
  ).bind(user.id, subdomainId, orderId, invoiceNumber).run()

  try {
    const payment = await createPaywuzOrder({
      amount: 5000,
      orderId,
      customerEmail: user.email || '',
      customerName: user.user_metadata?.full_name as string || '',
      description: `Upgrade ${subdomain.name as string}.tepi.my.id — 1 tahun | Invoice: ${invoiceNumber}`,
    })

    return NextResponse.json({
      success: true,
      qr_url: payment.qr_url,
      qr_image: payment.qr_image,
      order_id: orderId,
      invoice_number: invoiceNumber,
      expires_at: payment.expired_at,
    })
  } catch {
    return NextResponse.json({ error: 'Gagal membuat pembayaran. Coba lagi.' }, { status: 500 })
  }
}
