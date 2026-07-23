/**
 * API Token management for CI/CD integration
 * Tokens are scoped to user, can be used for:
 * - Creating subdomains programmatically
 * - Updating DNS records
 * - Reading subdomain status
 * - Receiving webhook events
 */

import { getDB } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/auth'

const TOKEN_PREFIX = 'tepi_'

/**
 * Generate a new API token
 */
export async function generateApiToken(userId: string, name: string): Promise<{ token: string; tokenHash: string }> {
  // Generate random token: tepi_<32 random chars>
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  const token = TOKEN_PREFIX + Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Hash for storage (like password)
  const tokenHash = await hashPassword(token)

  const db = await getDB()
  await db.prepare(
    `UPDATE users SET api_token = ?, api_token_created_at = datetime('now'), api_token_name = ? WHERE id = ?`
  ).bind(tokenHash, name, userId).run()

  return { token, tokenHash }
}

/**
 * Validate API token and return user
 */
export async function validateApiToken(token: string): Promise<{ id: string; email: string; role: string } | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null

  const db = await getDB()
  const user = await db.prepare(
    `SELECT id, email, role, api_token FROM users WHERE api_token IS NOT NULL`
  ).all()

  for (const u of user.results ?? []) {
    const isValid = await verifyPassword(token, u.api_token as string)
    if (isValid) {
      // Update last used
      await db.prepare(
        `UPDATE users SET api_token_last_used_at = datetime('now') WHERE id = ?`
      ).bind(u.id).run()

      return { id: u.id as string, email: u.email as string, role: u.role as string }
    }
  }

  return null
}

/**
 * Revoke API token
 */
export async function revokeApiToken(userId: string): Promise<boolean> {
  const db = await getDB()
  await db.prepare(
    `UPDATE users SET api_token = NULL, api_token_created_at = NULL, api_token_name = NULL WHERE id = ?`
  ).bind(userId).run()
  return true
}

/**
 * Get token info (for display)
 */
export async function getApiTokenInfo(userId: string): Promise<{ name: string; createdAt: string; lastUsedAt: string | null } | null> {
  const db = await getDB()
  const user = await db.prepare(
    `SELECT api_token_name, api_token_created_at, api_token_last_used_at FROM users WHERE id = ?`
  ).bind(userId).first() as Record<string, unknown> | null

  if (!user || !user.api_token_name) return null

  return {
    name: user.api_token_name as string,
    createdAt: user.api_token_created_at as string,
    lastUsedAt: user.api_token_last_used_at as string | null,
  }
}

/**
 * Middleware helper to extract and validate API token from Authorization header
 */
export function extractApiToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}