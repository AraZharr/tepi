import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { subdomain_name, reporter_email, reason } = body

  if (!subdomain_name || !reason) {
    return NextResponse.json({ error: 'Subdomain name and reason required' }, { status: 400 })
  }

  if (reason.length < 20) {
    return NextResponse.json({ error: 'Alasan minimal 20 karakter' }, { status: 400 })
  }

  const db = await getDB()
  await db.prepare(
    `INSERT INTO abuse_reports (subdomain_name, reporter_email, reason) VALUES (?, ?, ?)`
  ).bind(subdomain_name, reporter_email || null, reason).run()

  return NextResponse.json({ success: true, message: 'Laporan terkirim. Terima kasih!' })
}
