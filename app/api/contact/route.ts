import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { name, email, subject, message } = body

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message required' }, { status: 400 })
  }

  if (!email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const db = await getDB()
  await db.prepare(
    `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`
  ).bind(name, email, subject || null, message).run()

  return NextResponse.json({ success: true })
}
