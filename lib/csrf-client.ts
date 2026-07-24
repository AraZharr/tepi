/** Client-side CSRF helpers (browser only). */

import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/csrf'

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** fetch wrapper — inject X-CSRF-Token for mutating methods. Always credentials. */
export async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)

  if (method !== 'GET' && method !== 'HEAD') {
    let token = getCsrfToken()
    // Cookie belum ada (tab baru) — seed via GET /api/auth dulu
    if (!token) {
      try {
        await fetch('/api/auth', { credentials: 'include' })
        token = getCsrfToken()
      } catch { /* ignore */ }
    }
    if (token) headers.set(CSRF_HEADER, token)
  }

  return fetch(input, { ...init, headers, credentials: 'include' })
}
