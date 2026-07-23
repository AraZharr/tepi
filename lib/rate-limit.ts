import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting (use Redis/KV in production for multi-instance)
const store = new Map<string, { count: number; resetAt: number }>()

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyPrefix?: string
}

/**
 * Simple sliding window rate limiter
 * In production, use Upstash Redis, Cloudflare Workers KV, or similar
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyPrefix = 'rl' } = options

  return async function (request: NextRequest, key: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    resetAt: number
    retryAfter?: number
  }> {
    const fullKey = `${keyPrefix}:${key}`
    const now = Date.now()

    let entry = store.get(fullKey)

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of store.entries()) {
        if (v.resetAt < now) store.delete(k)
      }
    }

    if (!entry || entry.resetAt < now) {
      // New window
      entry = { count: 0, resetAt: now + windowMs }
      store.set(fullKey, entry)
    }

    entry.count++
    const remaining = Math.max(0, maxRequests - entry.count)

    if (entry.count > maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      }
    }

    return {
      success: true,
      limit: maxRequests,
      remaining,
      resetAt: entry.resetAt,
    }
  }
}

/**
 * Auth-specific rate limiter:
 * - POST /api/auth (login/register): 10 req/min per IP
 * - POST /api/auth/otp: 3 req/min per email
 * - POST /api/auth/forgot-password: 2 req/hour per email
 * - POST /api/user/subdomains: 5 req/min per user
 */
export const authRateLimit = rateLimit({
  windowMs: 60_000, // 1 minute
  maxRequests: 10,
  keyPrefix: 'auth',
})

export const subdomainRateLimit = rateLimit({
  windowMs: 60_000, // 1 minute
  maxRequests: 5,
  keyPrefix: 'subdomain',
})

export const otpRateLimit = rateLimit({
  windowMs: 60_000, // 1 minute
  maxRequests: 3,
  keyPrefix: 'otp',
})

export const forgotPasswordRateLimit = rateLimit({
  windowMs: 3_600_000, // 1 hour
  maxRequests: 2,
  keyPrefix: 'forgot',
})

/**
 * Helper to get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Helper to add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: { limit: number; remaining: number; resetAt: number; retryAfter?: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
  if (result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter))
  }
  return response
}