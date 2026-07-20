import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'

/**
 * Set admin role untuk user pertama.
 * Endpoint: GET /api/admin/setup
 * Hanya bisa dipanggil oleh ADMIN_USER_ID (env)
 */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only ADMIN_USER_ID can self-promote
  if (user.id !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Only primary admin can setup' }, { status: 403 })
  }

  const db = await getDB()

  // Ensure user record exists
  const existing = await db.prepare('SELECT id, role FROM users WHERE id = ?').bind(user.id).first() as any
  if (!existing) {
    await db.prepare(
      'INSERT INTO users (id, email, full_name, role, subdomain_limit) VALUES (?, ?, ?, ?, ?)'
    ).bind(user.id, user.email || '', user.full_name || 'Admin', 'admin', 999).run()
  } else {
    await db.prepare(
      'UPDATE users SET role = ?, subdomain_limit = ? WHERE id = ?'
    ).bind('admin', 999, user.id).run()
  }

  return NextResponse.json({
    success: true,
    message: '✅ Admin role set! You now have full admin access.',
    user_id: user.id,
    role: 'admin',
  })
}
