import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Ambil instance D1 database dari Cloudflare context.
 * Dipanggil di dalam API Route atau Server Component.
 *
 * Contoh penggunaan:
 *   const db = await getDB()
 *   const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
 */
export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext<CloudflareEnv>()
  return env.DB
}
