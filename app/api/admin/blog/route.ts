import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const posts = await db.prepare(
    `SELECT id, slug, title, excerpt, tags, is_published, is_featured, published_at, created_at, updated_at
     FROM posts ORDER BY created_at DESC`
  ).all()

  return NextResponse.json({ posts: posts.results ?? [] })
}

export async function POST(req: Request) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const body: any = await req.json()
  const { slug, title, content, excerpt, cover_image, author_name, tags, is_published, is_featured } = body

  if (!slug || !title || !content) {
    return NextResponse.json({ error: 'slug, title, content required' }, { status: 400 })
  }

  const db = await getDB()
  const existing = await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(slug).first()
  if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })

  const now = new Date().toISOString().replace('T', ' ').replace(/\..*/, '')
  await db.prepare(
    `INSERT INTO posts (slug, title, content, excerpt, cover_image, author_name, tags, is_published, is_featured, published_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    slug, title, content, excerpt || null, cover_image || null,
    author_name || 'tepi.my.id', tags || null,
    is_published ? 1 : 0, is_featured ? 1 : 0,
    is_published ? now : null, now
  ).run()

  return NextResponse.json({ success: true })
}
