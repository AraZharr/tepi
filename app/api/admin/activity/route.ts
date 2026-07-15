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
  const logs = await db.prepare(
    'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200'
  ).all()

  return NextResponse.json({ logs: logs.results ?? [] })
}
