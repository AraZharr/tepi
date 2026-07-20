import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDB } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken, setSessionCookie, clearSessionCookie, getSessionUser, requireUser, issueOtp, consumeOtp, findUserByIdentifier } from '@/lib/auth'

export async function POST(request: Request) {
  const body: any = await request.json()
  const { email, password, username, fullName } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const user = await findUserByIdentifier(email)
  if (user) {
    if (user.is_suspended) {
      return NextResponse.json({ error: 'Akun sedang di-suspend' }, { status: 403 })
    }
    if (!user.email_verified) {
      return NextResponse.json({ error: 'Email belum diverifikasi' }, { status: 403 })
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }
  } else {
    const passwordHash = await hashPassword(password)
    const userId = crypto.randomUUID()
    const now = new Date().toISOString()

    await getDB().prepare(
      `INSERT INTO users (id, email, username, full_name, password_hash, role, subdomain_limit, email_verified)
       VALUES (?, ?, ?, ?, ?, 'user', 2, 0)`
    ).bind(userId, email, username, fullName, passwordHash).run()

    await issueOtp(email, 'register')
    return NextResponse.json({ message: 'Kami telah mengirim OTP ke email kamu' }, { status: 201 })
  }

  const token = await createSessionToken(user.id)
  const res = NextResponse.json({ token, user: { id: user.id, email, username, full_name: user.full_name } }, { status: 201 })
  setSessionCookie(res, user.id)
  return res
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user })
}

export async function PUT(request: Request) {
  const body: any = await request.json()
  const { code, identifier, password } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'OTP wajib diisi' }, { status: 400 })
  }
  if (!identifier || typeof identifier !== 'string') {
    return NextResponse.json({ error: 'Email/Username wajib diisi' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const result = await consumeOtp(identifier, 'login', code)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const user = await findUserByIdentifier(identifier)
  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }
  if (user.is_suspended) {
    return NextResponse.json({ error: 'Akun sedang di-suspend' }, { status: 403 })
  }
  if (!user.email_verified) {
    return NextResponse.json({ error: 'Email belum diverifikasi' }, { status: 403 })
  }
  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const token = await createSessionToken(user.id)
  const res = NextResponse.json({ token, user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name } }, { status: 200 })
  setSessionCookie(res, user.id)
  return res
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  clearSessionCookie(NextResponse.json({ ok: true }, { status: 200 }))
  return NextResponse.json({ ok: true }, { status: 200 })
}