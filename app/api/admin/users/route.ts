import { NextRequest, NextResponse } from 'next/server'
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
  const [users, subdomains, applications, payments] = await Promise.all([
    db.prepare('SELECT id, email, full_name, role, subdomain_limit, created_at FROM users ORDER BY created_at DESC LIMIT 100').all(),
    db.prepare('SELECT id, user_id, name, status, plan, expires_at, created_at FROM subdomains ORDER BY created_at DESC LIMIT 100').all(),
    db.prepare('SELECT id, user_id, subdomain_name, status, created_at FROM subdomain_applications ORDER BY created_at DESC LIMIT 100').all(),
    db.prepare('SELECT * FROM payments ORDER BY created_at DESC LIMIT 100').all(),
  ])

  return NextResponse.json({
    users: users.results ?? [],
    subdomains: subdomains.results ?? [],
    applications: applications.results ?? [],
    payments: payments.results ?? [],
  })
}

export async function PATCH(req: NextRequest) {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const { id, full_name, role, subdomain_limit } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = await getDB()
  await db.prepare('UPDATE users SET full_name = ?, role = ?, subdomain_limit = ? WHERE id = ?')
    .bind(full_name, role, subdomain_limit, id).run()

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  try { await guard() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = await getDB()
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

  return NextResponse.json({ success: true })
}
