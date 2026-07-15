import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDB } from '@/lib/db'

const guard = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== process.env.ADMIN_USER_ID) throw new Error('Forbidden')
  return user
}

export async function GET() {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const payments = await db.prepare(
    'SELECT * FROM payments ORDER BY created_at DESC LIMIT 100'
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
