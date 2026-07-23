import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getDB } from '@/lib/db'

export async function GET() {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const db = await getDB()
  const [users, subdomains, applications, payments] = await Promise.all([
    db.prepare('SELECT id, email, full_name, role, subdomain_limit, created_at FROM users ORDER BY created_at DESC LIMIT 100').all(),
    db.prepare('SELECT * FROM subdomains ORDER BY created_at DESC LIMIT 100').all(),
    db.prepare('SELECT * FROM subdomain_applications ORDER BY created_at DESC LIMIT 100').all(),
    db.prepare('SELECT * FROM payments ORDER BY created_at DESC LIMIT 100').all(),
  ])

  return NextResponse.json({
    users: users.results ?? [],
    subdomains: subdomains.results ?? [],
    applications: applications.results ?? [],
    payments: payments.results ?? [],
  })
}

// CREATE new user
export async function POST(req: NextRequest) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const body = await req.json()
  const { resource, email, full_name, role, subdomain_limit, user_id, name, status, plan, expires_at, target_type, target_value, subdomain_name, record_type, record_value } = body

  const db = await getDB()

  // Create user
  if (!resource) {
    if (!email) return NextResponse.json({ error: 'Email wajib' }, { status: 400 })
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await db.prepare(
      `INSERT INTO users (id, email, full_name, role, subdomain_limit) VALUES (?, ?, ?, ?, ?)`
    ).bind(id, email, full_name || null, role || 'user', subdomain_limit ?? 2).run()
    return NextResponse.json({ success: true, id })
  }

  // Create subdomain
  if (resource === 'subdomain') {
    if (!user_id || !name) return NextResponse.json({ error: 'user_id dan name wajib' }, { status: 400 })
    const id = `sd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await db.prepare(
      `INSERT INTO subdomains (id, user_id, name, status, plan, expires_at, target_type, target_value, ns_addon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, user_id, name, status || 'active', plan || 'free', expires_at || null, target_type || 'CNAME', target_value || '', 0).run()
    return NextResponse.json({ success: true, id })
  }

  // Create application
  if (resource === 'application') {
    if (!user_id || !subdomain_name) return NextResponse.json({ error: 'user_id dan subdomain_name wajib' }, { status: 400 })
    const id = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await db.prepare(
      `INSERT INTO subdomain_applications (id, user_id, subdomain_name, record_type, record_value, status, ns_addon, ns_records)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, user_id, subdomain_name, record_type || 'CNAME', record_value || '', status || 'pending', 0, null).run()
    return NextResponse.json({ success: true, id })
  }

  return NextResponse.json({ error: 'Unknown resource' }, { status: 400 })
}

// UPDATE user/subdomain/application
export async function PATCH(req: NextRequest) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const body = await req.json()
  const { id, resource, data, email, full_name, role, subdomain_limit, user_id, name, status, plan, expires_at, target_type, target_value, subdomain_name, record_type, record_value } = body

  const db = await getDB()

  // Update user
  if (!resource) {
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await db.prepare('UPDATE users SET email = COALESCE(?, email), full_name = COALESCE(?, full_name), role = COALESCE(?, role), subdomain_limit = COALESCE(?, subdomain_limit) WHERE id = ?')
      .bind(email ?? null, full_name ?? null, role ?? null, subdomain_limit ?? null, id).run()
    return NextResponse.json({ success: true })
  }

  // Update subdomain
  if (resource === 'subdomain') {
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await db.prepare(
      `UPDATE subdomains SET user_id = COALESCE(?, user_id), name = COALESCE(?, name), status = COALESCE(?, status),
       plan = COALESCE(?, plan), expires_at = COALESCE(?, expires_at), target_type = COALESCE(?, target_type),
       target_value = COALESCE(?, target_value), ns_addon = COALESCE(?, ns_addon) WHERE id = ?`
    ).bind(user_id ?? null, name ?? null, status ?? null, plan ?? null, expires_at ?? null, target_type ?? null, target_value ?? null, 0, id).run()
    return NextResponse.json({ success: true })
  }

  // Update application
  if (resource === 'application') {
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await db.prepare(
      `UPDATE subdomain_applications SET user_id = COALESCE(?, user_id), subdomain_name = COALESCE(?, subdomain_name),
       record_type = COALESCE(?, record_type), record_value = COALESCE(?, record_value), status = COALESCE(?, status),
       ns_addon = COALESCE(?, ns_addon), ns_records = COALESCE(?, ns_records) WHERE id = ?`
    ).bind(user_id ?? null, subdomain_name ?? null, record_type ?? null, record_value ?? null, status ?? null, 0, null, id).run()
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown resource' }, { status: 400 })
}

// DELETE user/subdomain/application
export async function DELETE(req: NextRequest) {
  try { await requireAdmin() } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  // Support both query params (legacy) and body
  const url = new URL(req.url)
  const queryId = url.searchParams.get('id')
  
  let id = queryId
  let resource = 'user' // default resource when using query params
  
  // Try body if no query params
  if (!queryId) {
    try {
      const body = await req.json()
      id = body.id
      resource = body.resource || 'user'
    } catch {
      // No body, stick with query params
    }
  }
  
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = await getDB()

  if (resource === 'subdomain') {
    await db.prepare('DELETE FROM subdomains WHERE id = ?').bind(id).run()
    return NextResponse.json({ success: true })
  }

  if (resource === 'application') {
    await db.prepare('DELETE FROM subdomain_applications WHERE id = ?').bind(id).run()
    return NextResponse.json({ success: true })
  }

  // Default: delete user
  const admin = await requireAdmin().catch(() => null)
  if (admin && admin.id === id) {
    return NextResponse.json({ error: 'Tidak bisa hapus akun sendiri' }, { status: 400 })
  }

  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  return NextResponse.json({ success: true })
}
