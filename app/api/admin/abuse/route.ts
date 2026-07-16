import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'

const guard = async () => {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function GET() {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()

  const [pending, all] = await Promise.all([
    db.prepare('SELECT * FROM abuse_reports WHERE status = \'pending\' ORDER BY created_at DESC').all(),
    db.prepare('SELECT * FROM abuse_reports ORDER BY created_at DESC LIMIT 100').all(),
  ])

  return NextResponse.json({
    pending: pending.results ?? [],
    all: all.results ?? [],
  })
}

export async function PUT(req: Request) {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const body = await req.json()
  const { id, status } = body

  if (!['reviewed', 'actioned'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const db = await getDB()
  await db.prepare('UPDATE abuse_reports SET status = ? WHERE id = ?').bind(status, id).run()

  return NextResponse.json({ success: true })
}
