import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()

  const [pending, all] = await Promise.all([
    db.prepare(
      `SELECT sa.*, u.email, u.full_name
       FROM subdomain_applications sa
       JOIN users u ON u.id = sa.user_id
       WHERE sa.status = 'pending'
       ORDER BY sa.created_at ASC`
    ).all(),
    db.prepare(
      `SELECT sa.*, u.email, u.full_name
       FROM subdomain_applications sa
       JOIN users u ON u.id = sa.user_id
       ORDER BY sa.created_at DESC LIMIT 50`
    ).all(),
  ])

  return NextResponse.json({
    pending: pending.results ?? [],
    all: all.results ?? [],
  })
}
