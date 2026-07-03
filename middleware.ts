import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Matcher: semua route kecuali API, static files, dan _next
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
