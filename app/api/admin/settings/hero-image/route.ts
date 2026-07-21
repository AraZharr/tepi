import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = await getDB()
  const db2 = await getDB()

  let isAdmin = user.id === process.env.ADMIN_USER_ID
  if (!isAdmin) {
    const record = await db.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first() as any
    isAdmin = record?.role === 'admin'
  }
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { image } = await req.json()
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 })
  }

  const now = new Date().toISOString().replace('T', ' ').replace(/\..*/, '')
  await db2.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ('hero_image_data', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(image, now).run()

  return NextResponse.json({ success: true })
}
