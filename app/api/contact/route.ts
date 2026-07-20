import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { notifNewContact } from '@/lib/admin-notif'

export async function POST(req: Request) {
  const body: any = await req.json()
  const { name, email, subject, message } = body

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message required' }, { status: 400 })
  }
  if (message.length < 10) {
    return NextResponse.json({ error: 'Pesan minimal 10 karakter' }, { status: 400 })
  }

  const db = await getDB()
  await db.prepare(
    `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`
  ).bind(name, email, subject || null, message).run()

  // Push notif ke admin
  notifNewContact(name, email, subject || 'Tidak ada subjek', message)

  return NextResponse.json({ success: true, message: '✅ Pesan terkirim!' })
}
