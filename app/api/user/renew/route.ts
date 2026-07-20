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

    // Extend 3 months
    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + 90)
    const expiresAt = newExpiry.toISOString().replace('T', ' ').replace(/\..*/, '')

    await db.prepare(
      'UPDATE subdomains SET expires_at = ?, status = ? WHERE id = ?'
    ).bind(expiresAt, 'active', subdomain_id).run()

    return NextResponse.json({ success: true, expires_at: expiresAt, message: '✅ Subdomain diperpanjang 3 bulan!' })
  }

  if (action === 'upgrade_paid') {
    // Generate Paywuz order
    return NextResponse.json({
      success: true,
      redirect_url: `/api/payment/create?subdomain_id=${subdomain_id}`,
      message: 'Mengarahkan ke pembayaran...'
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
