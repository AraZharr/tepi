import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDB } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDB()
  const invoice = await db.prepare(
    `SELECT p.*, s.name as subdomain_name, s.target_type, s.target_value, s.plan,
            u.full_name, u.email
     FROM payments p
     JOIN subdomains s ON s.id = p.subdomain_id
     JOIN users u ON u.id = p.user_id
     WHERE p.invoice_number = ? AND (p.user_id = ?
       OR EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'admin'))`
  ).bind(id, user.id, user.id).first() as Record<string, unknown> | null

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ invoice })
}
