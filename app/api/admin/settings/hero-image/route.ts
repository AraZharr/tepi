import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const { image } = await req.json()
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
  }

  const now = new Date().toISOString().replace('T', ' ').replace(/\..*/, '')
  await db.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ('hero_image_data', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(image, now).run()

  return NextResponse.json({ success: true })
}
