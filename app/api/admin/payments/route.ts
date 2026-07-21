import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const payments = await db.prepare(
    `SELECT p.*, s.name as subdomain_name
     FROM payments p
     LEFT JOIN subdomains s ON s.id = p.subdomain_id
     ORDER BY p.created_at DESC LIMIT 100`
  ).all()

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
