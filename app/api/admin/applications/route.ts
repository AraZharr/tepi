import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  if (user.id === process.env.ADMIN_USER_ID) return true // fallback
  try {
    const db = await getDB()
    const record = await db.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first() as any
    return record?.role === 'admin'
  } catch { return false }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
