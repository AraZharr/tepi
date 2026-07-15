import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = await getDB()

  const post = await db.prepare(
    `SELECT * FROM posts WHERE slug = ? AND is_published = 1`
  ).bind(slug).first() as Record<string, unknown> | null

  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ post })
}
