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
  const [users, subdomains, applications, payments] = await Promise.all([
    db.prepare('SELECT id, email, full_name, created_at FROM users ORDER BY created_at DESC LIMIT 100').all(),
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
