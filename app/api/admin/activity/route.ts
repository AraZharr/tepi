import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'

const guard = async () => {
  const user = await getSessionUser()
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
