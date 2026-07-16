import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'

const guard = async () => {
  const user = await getSessionUser()
  if (!user) throw new Error('Forbidden')
  let isAdmin = user.id === process.env.ADMIN_USER_ID
  if (!isAdmin) {
    const db = await getDB()
    const r = await db.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first() as any
    isAdmin = r?.role === 'admin'
  }
  if (!isAdmin) throw new Error('Forbidden')
  return user
}

export async function GET() {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const payments = await db.prepare(
    `SELECT p.*, s.name as subdomain_name
     FROM payments p
     LEFT JOIN subdomains s ON s.id = p.subdomain_id
     ORDER BY p.created_at DESC LIMIT 100`
  ).all()

  // Stats
  const stats = await db.prepare(
    `SELECT
       COUNT(*) as total,
       COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) as success,
       COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0) as revenue
     FROM payments`
  ).first()

  return NextResponse.json({
    payments: payments.results ?? [],
    stats,
  })
}
