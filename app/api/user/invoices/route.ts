import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDB()
  const invoices = await db.prepare(
    `SELECT p.id, p.invoice_number, p.amount, p.fee, p.status, p.paid_at, p.created_at,
            s.name as subdomain_name
     FROM payments p
     JOIN subdomains s ON s.id = p.subdomain_id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC`
  ).bind(user.id).all()

  return NextResponse.json({ invoices: invoices.results ?? [] })
}
