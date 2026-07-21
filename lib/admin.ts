import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'

/** Session user with admin role (DB) or ADMIN_USER_ID env match. */
export async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) throw new Error('Forbidden')

  if (user.id === process.env.ADMIN_USER_ID) return user

  const db = await getDB()
  const record = await db.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first() as { role?: string } | null
  if (record?.role === 'admin') return user

  throw new Error('Forbidden')
}

export async function isAdminUser(userId: string): Promise<boolean> {
  if (userId === process.env.ADMIN_USER_ID) return true
  try {
    const db = await getDB()
    const record = await db.prepare('SELECT role FROM users WHERE id = ?').bind(userId).first() as { role?: string } | null
    return record?.role === 'admin'
  } catch {
    return false
  }
}
