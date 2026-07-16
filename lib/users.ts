import { getDB } from '@/lib/db'

export async function ensureUserRecord(userId: string, email: string, username: string | null, fullName: string | null) {
  const db = await getDB()
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, username, full_name, role, subdomain_limit, email_verified)
       VALUES (?, ?, ?, ?, 'user', 2, 1)`
    )
    .bind(userId, email, username, fullName)
    .run()
}
