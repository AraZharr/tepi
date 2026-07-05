import { getDB } from '@/lib/db'
import type { User } from '@supabase/supabase-js'

export async function ensureUserRecord(user: User) {
  const db = await getDB()
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, full_name, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    )
    .bind(
      user.id,
      user.email ?? '',
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
    )
    .run()
}
