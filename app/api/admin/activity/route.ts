import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const logs = await db.prepare(
    'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200'
  ).all()

  return NextResponse.json({ logs: logs.results ?? [] })
}
