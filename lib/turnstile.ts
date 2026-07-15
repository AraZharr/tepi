/**
 * Turnstile CAPTCHA utility
 * Dipakai di register, login, dan form claim subdomain
 */

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // fail open kalo gak dikonfigurasi

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return true // fail open kalo network error
  }
}
