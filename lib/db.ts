import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Ambil instance D1 database langsung dari binding env.DB.
 * Runtime OpenNext/Cloudflare kadang wrap proxy — akses langsung via env.
 */
export async function getDB(): Promise<D1Database> {
  const ctx = await getCloudflareContext({ async: true })
  const env = ctx?.env ?? ctx ?? {}

  // Langsung cari binding DB di env object
  const binding = env.DB ?? env.db ?? env.D1 ?? env.database
  if (binding && typeof binding.prepare === 'function') {
    return binding
  }

  // Fallback: mungkin ctx langsung adalah env
  const direct = ctx?.DB ?? ctx?.db
  if (direct && typeof direct.prepare === 'function') {
    return direct
  }

  // Debug: kirim keys buat tracing
  const ctxKeys = ctx ? Object.keys(ctx).join(',') : 'null'
  const envKeys = typeof env === 'object' && env ? Object.keys(env).join(',') : 'null'
  throw new Error(
    `D1 binding not found. ctx keys: ${ctxKeys} | env keys: ${envKeys} | typeof binding: ${typeof binding}`
  )
}
