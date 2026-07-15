import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDB } from '@/lib/db'

const guard = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== process.env.ADMIN_USER_ID) throw new Error('Forbidden')
  return user
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const { id } = await params
  const body = await req.json()
  const { slug, title, content, excerpt, cover_image, author_name, tags, is_published, is_featured } = body

  const db = await getDB()

  // Check slug uniqueness (exclude current)
  if (slug) {
    const existing = await db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').bind(slug, id).first()
    if (existing) return NextResponse.json({ error: 'Slug already used' }, { status: 409 })
  }

  const now = new Date().toISOString().replace('T', ' ').replace(/\..*/, '')
  const existingPost = await db.prepare('SELECT is_published FROM posts WHERE id = ?').bind(id).first() as Record<string, unknown> | null
  const wasPublished = existingPost?.is_published

  const publishAt = (!wasPublished && is_published) ? now : undefined

  await db.prepare(
    `UPDATE posts SET
      slug = COALESCE(?, slug),
      title = COALESCE(?, title),
      content = COALESCE(?, content),
      excerpt = COALESCE(?, excerpt),
      cover_image = COALESCE(?, cover_image),
      author_name = COALESCE(?, author_name),
      tags = COALESCE(?, tags),
      is_published = COALESCE(?, is_published),
      is_featured = COALESCE(?, is_featured),
      published_at = COALESCE(?, published_at),
      updated_at = ?
     WHERE id = ?`
  ).bind(
    slug, title, content, excerpt, cover_image, author_name, tags,
    is_published !== undefined ? (is_published ? 1 : 0) : undefined,
    is_featured !== undefined ? (is_featured ? 1 : 0) : undefined,
    publishAt, now, id
  ).run()

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const { id } = await params
  const db = await getDB()
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run()

  return NextResponse.json({ success: true })
}
