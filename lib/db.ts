import { getCloudflareContext } from '@opennextjs/cloudflare'

type MaybeDB = {
  prepare?: (query: string) => any
  env?: Record<string, any>
  [key: string]: any
}

function pickDbFromObject(obj: any): D1Database | null {
  if (!obj) return null
  if (typeof obj.prepare === 'function') return obj as D1Database

  const keys = ['DB', 'db', 'D1', 'DATABASE', 'database']
  for (const key of keys) {
    const v = obj[key]
    if (v && typeof v.prepare === 'function') return v as D1Database
  }

  if (obj.env) {
    for (const key of keys) {
      const v = obj.env[key]
      if (v && typeof v.prepare === 'function') return v as D1Database
    }
  }

  if (obj.bindings) {
    for (const key of keys) {
      const v = obj.bindings[key]
      if (v && typeof v.prepare === 'function') return v as D1Database
    }
  }

  return null
}

/**
 * Ambil instance D1 database dari Cloudflare/OpenNext context.
 * Handle beberapa shape runtime berbeda.
 */
export async function getDB(): Promise<D1Database> {
  const ctx = await getCloudflareContext({ async: true })

  const direct = pickDbFromObject(ctx)
  if (direct) return direct

  const fromEnv = pickDbFromObject(ctx?.env)
  if (fromEnv) return fromEnv

  const envKeys = ctx?.env ? Object.keys(ctx.env).slice(0, 20) : []
  const topKeys = ctx ? Object.keys(ctx).slice(0, 20) : []
  throw new Error(`D1 binding not found or invalid. top keys: ${topKeys.join(', ')} | env keys: ${envKeys.join(', ')}`)
}
