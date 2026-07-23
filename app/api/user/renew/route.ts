import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { verifyTurnstile } from '@/lib/turnstile'
import { createDNSRecord } from '@/lib/cloudflare-dns'

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: any = await req.json()
  const { subdomain_id, action, turnstile_token } = body

  if (!subdomain_id || !action) {
    return NextResponse.json({ error: 'subdomain_id and action required' }, { status: 400 })
  }

  if (action === 'renew_free') {
    // Verify captcha for free renewal
    const captchaValid = await verifyTurnstile(turnstile_token || '')
    if (!captchaValid) {
      return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal' }, { status: 400 })
    }
  }

  const db = await getDB()
  const subdomain = await db.prepare(
    'SELECT * FROM subdomains WHERE id = ? AND user_id = ?'
  ).bind(subdomain_id, user.id).first() as Record<string, unknown> | null

  if (!subdomain) return NextResponse.json({ error: 'Subdomain not found' }, { status: 404 })

  if (action === 'renew_free') {
    // Check target still pointing
    const targetUrl = subdomain.target_value as string
    let targetActive = true

    try {
      const hostname = targetUrl.startsWith('http') ? new URL(targetUrl).hostname : targetUrl
      const dnsRes = await fetch(`https://dns.google/resolve?name=${hostname}&type=${subdomain.target_type}`)
      const dnsData = await dnsRes.json()
      if (!dnsData.Answer || dnsData.Answer.length === 0) {
        targetActive = false
      }
    } catch {
      targetActive = false
    }

    if (!targetActive) {
      return NextResponse.json({
        error: 'Target tidak aktif. Pastikan domain target masih pointing dengan benar.',
        hint: 'Update URL target dulu lewat dashboard.'
      }, { status: 400 })
    }

    // Free plan only — paid plan must use payment
    if ((subdomain.plan as string) === 'paid') {
      return NextResponse.json({
        error: 'Plan berbayar tidak bisa free renew. Pilih paket berbayar.',
      }, { status: 400 })
    }

    // Extend 3 months from later of now or current expiry
    const base = subdomain.expires_at
      ? new Date(String(subdomain.expires_at).includes('T') ? String(subdomain.expires_at) : String(subdomain.expires_at) + 'Z')
      : new Date()
    const from = base.getTime() > Date.now() ? base : new Date()
    from.setDate(from.getDate() + 90)
    const expiresAt = from.toISOString().replace('T', ' ').replace(/\..*/, '')

    await db.prepare(
      'UPDATE subdomains SET expires_at = ?, status = ?, plan = ? WHERE id = ?'
    ).bind(expiresAt, 'active', 'free', subdomain_id).run()

    return NextResponse.json({ success: true, expires_at: expiresAt, message: 'Subdomain diperpanjang 3 bulan (gratis).' })
  }

  if (action === 'upgrade_paid') {
    return NextResponse.json({
      success: true,
      redirect_url: `/api/payment/create?subdomain_id=${subdomain_id}`,
      message: 'Mengarahkan ke pembayaran...'
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
