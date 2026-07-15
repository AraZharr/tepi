import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDB } from '@/lib/db'
import { validateSubdomainName, validateTargetURL } from '@/lib/validators'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDB()

  const [applications, subdomains] = await Promise.all([
    db.prepare(
      `SELECT id, subdomain_name, target_platform, target_url, status, reject_reason, created_at
       FROM subdomain_applications WHERE user_id = ? ORDER BY created_at DESC`
    ).bind(user.id).all(),
    db.prepare(
      `SELECT id, name, target_type, target_value, status, plan, expires_at, created_at
       FROM subdomains WHERE user_id = ? ORDER BY created_at DESC`
    ).bind(user.id).all(),
  ])

  return NextResponse.json({
    applications: applications.results ?? [],
    subdomains: subdomains.results ?? [],
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { subdomain_name, target_platform, target_url, project_type, project_description, is_public, has_monetization, github_link, linkedin_link, social_link } = body

  // Validate
  const nameCheck = validateSubdomainName(subdomain_name)
  if (!nameCheck.valid) return NextResponse.json({ error: nameCheck.error }, { status: 400 })

  const urlCheck = validateTargetURL(target_url)
  if (!urlCheck.valid) return NextResponse.json({ error: urlCheck.error }, { status: 400 })

  if (!project_type || !project_description) {
    return NextResponse.json({ error: 'Project type and description required' }, { status: 400 })
  }

  if (project_description.length < 100) {
    return NextResponse.json({ error: 'Deskripsi minimal 100 karakter' }, { status: 400 })
  }

  const db = await getDB()

  // Check if subdomain name already taken
  const existing = await db.prepare(
    `SELECT id FROM subdomains WHERE name = ? UNION SELECT id FROM subdomain_applications WHERE subdomain_name = ? AND status = 'pending'`
  ).bind(subdomain_name, subdomain_name).first()

  if (existing) {
    return NextResponse.json({ error: 'Nama subdomain sudah digunakan atau sedang diproses' }, { status: 409 })
  }

  await db.prepare(
    `INSERT INTO subdomain_applications (user_id, subdomain_name, target_platform, target_url, project_type, project_description, is_public, has_monetization, github_link, linkedin_link, social_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    user.id,
    subdomain_name.toLowerCase().trim(),
    target_platform,
    target_url,
    project_type,
    project_description,
    is_public ? 1 : 0,
    has_monetization ? 1 : 0,
    github_link || null,
    linkedin_link || null,
    social_link || null
  ).run()

  return NextResponse.json({ success: true })
}
