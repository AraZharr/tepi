import createMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from '@/i18n/routing'
import { checkCsrf, generateCsrfToken, CSRF_COOKIE, csrfCookieOptions } from '@/lib/csrf'

const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  // CSRF gate for mutating /api/* (except exempt list)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const csrfFail = checkCsrf(request)
    if (csrfFail) return csrfFail

    // Ensure CSRF cookie exists for subsequent client mutations
    const res = NextResponse.next()
    if (!request.cookies.get(CSRF_COOKIE)?.value) {
      res.cookies.set(CSRF_COOKIE, generateCsrfToken(), csrfCookieOptions())
    }
    return res
  }

  const response = intlMiddleware(request)

  // Seed CSRF cookie on page navigations so forms work after first paint
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, generateCsrfToken(), csrfCookieOptions())
  }

  return response
}

export const config = {
  matcher: [
    // Pages (i18n) + API (CSRF)
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
}
