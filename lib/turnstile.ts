/**
 * Turnstile CAPTCHA utility
 * Dipakai di register, login, claim, free renew
 */

export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false

  const secret = process.env.TURNSTILE_SECRET_KEY
  // Fail open only if secret never configured (local/dev)
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY missing — fail open')
    return true
  }

  try {
    // CF docs: application/x-www-form-urlencoded (JSON also ok, form more reliable)
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      console.error('[turnstile] verify fail', data['error-codes'])
    }
    return data.success === true
  } catch (e) {
    console.error('[turnstile] network', e)
    // Network error: fail open biar login gak total mati
    return true
  }
}
