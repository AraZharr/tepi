import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params

  const db = await getDB()

  // Get payment record
  const payment = await db.prepare(
    `SELECT p.*, s.name as subdomain_name
     FROM payments p
     JOIN subdomains s ON s.id = p.subdomain_id
     WHERE p.order_id = ? AND p.user_id = ?`
  ).bind(orderId, user.id).first() as Record<string, unknown> | null

  if (!payment) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Generate simple HTML receipt
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${payment.invoice_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #1f2937; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 800; color: #3b82f6; }
    .title { font-size: 28px; font-weight: 700; margin: 10px 0; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; }
    .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .meta-value { font-weight: 600; }
    .items { border-collapse: collapse; width: 100%; margin: 20px 0; }
    .items th, .items td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .items th { background: #f9fafb; font-weight: 600; }
    .total-row { font-weight: 700; font-size: 18px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
    .status-paid { background: #dcfce7; color: #166534; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">tepi.my.id</div>
    <h1 class="title">Invoice / Receipt</h1>
    <span class="status status-paid">LUNAS</span>
  </div>

  <div class="meta">
    <div>
      <div class="meta-label">Nomor Invoice</div>
      <div class="meta-value">${payment.invoice_number}</div>
    </div>
    <div>
      <div class="meta-label">Tanggal</div>
      <div class="meta-value">${new Date(payment.paid_at as string || payment.created_at as string).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <div>
      <div class="meta-label">Order ID</div>
      <div class="meta-value">${payment.order_id}</div>
    </div>
    <div>
      <div class="meta-label">Subdomain</div>
      <div class="meta-value">${payment.subdomain_name}.tepi.my.id</div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: right;">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Paket Dasar (1 tahun)</td>
        <td style="text-align: right;">Rp${(payment.base_amount as number).toLocaleString('id-ID')}</td>
      </tr>
      ${(payment.ns_addon_amount as number) > 0 ? `
      <tr>
        <td>NS Add-on (4 Nameserver)</td>
        <td style="text-align: right;">Rp${(payment.ns_addon_amount as number).toLocaleString('id-ID')}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td>Total</td>
        <td style="text-align: right;">Rp${(payment.amount as number).toLocaleString('id-ID')}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p><strong>tepi.my.id</strong> — Subdomain Platform</p>
    <p>Terima kasih telah menggunakan layanan kami.</p>
    <p>Invoice ini dibuat otomatis dan tidak memerlukan tanda tangan.</p>
  </div>
</body>
</html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `inline; filename="invoice-${payment.invoice_number}.html"`,
    },
  })
}