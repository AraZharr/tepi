import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const settings = await db.prepare('SELECT * FROM site_settings ORDER BY key').all()

  const map: Record<string, string> = {}
  for (const s of (settings.results ?? []) as Record<string, unknown>[]) {
    map[s.key as string] = s.value as string
  }

  return NextResponse.json({ settings: map })
}

export async function PUT(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const body: any = await req.json()
  const db = await getDB()
  const now = new Date().toISOString().replace('T', ' ').replace(/\..*/, '')

  for (const [key, value] of Object.entries(body)) {
    await db.prepare(
      `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(key, value, now).run()
  }

  return NextResponse.json({ success: true })
}
