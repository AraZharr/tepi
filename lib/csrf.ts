import { NextRequest, NextResponse } from 'next/server'

export const CSRF_COOKIE = 'tepi_csrf'
export const CSRF_HEADER = 'x-csrf-token'

/** Public mutating routes — no session cookie abuse risk / own auth. */
const CSRF_EXEMPT = [
  '/api/auth',
  '/api/auth/otp',
  '/api/webhook/',
  '/api/contact',
  '/api/abuse',
  '/api/chat',
  '/api/diag',
]

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function csrfCookieOptions(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: false, // double-submit: JS must read + send as header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export function setCsrfCookie(res: NextResponse, token?: string) {
  const t = token || generateCsrfToken()
  res.cookies.set(CSRF_COOKIE, t, csrfCookieOptions())
  return t
}

export function clearCsrfCookie(res: NextResponse) {
  res.cookies.set(CSRF_COOKIE, '', csrfCookieOptions(0))
}

function isExempt(pathname: string): boolean {
  return CSRF_EXEMPT.some((p) => pathname === p || pathname.startsWith(p))
}

/** Timing-safe string compare. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

/**
 * Validate CSRF for mutating API requests.
 * Returns NextResponse error if invalid, null if OK / skip.
 */
export function checkCsrf(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null

  const path = req.nextUrl.pathname
  if (!path.startsWith('/api/')) return null
  if (isExempt(path)) return null

  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value
  const headerToken = req.headers.get(CSRF_HEADER)

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: 'CSRF token invalid atau hilang. Refresh halaman lalu coba lagi.' },
      { status: 403 }
    )
  }
  return null
}
