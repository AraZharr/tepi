import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { verifyTurnstile } from '@/lib/turnstile'
import { hashPassword, verifyPassword, createSessionToken, setSessionCookie, issueOtp, consumeOtp, findUserByIdentifier } from '@/lib/auth'

/** POST — send OTP */
export async function POST(request: Request) {
  const body = await request.json()
  const { email, turnstile_token } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
  }

  if (turnstile_token) {
    const captchaOk = await verifyTurnstile(turnstile_token)
    if (!captchaOk) return NextResponse.json({ error: 'Verifikasi CAPTCHA gagal' }, { status: 400 })
  }

  await issueOtp(email, 'login')
  return NextResponse.json({ message: 'Kode OTP dikirim ke email kamu' })
}

/** PUT — verify OTP + login (for login & register verify) */
export async function PUT(request: Request) {
  const body = await request.json()
  const { code, identifier, email, password } = body
  const id = identifier || email

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Kode OTP wajib diisi' }, { status: 400 })
  }
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Email/Username wajib diisi' }, { status: 400 })
  }

  // Try login OTP first, then register OTP
  let result = await consumeOtp(id, 'login', code)
  let purpose = 'login'
  if (!result.ok) {
    result = await consumeOtp(id, 'register', code)
    purpose = 'register'
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const user = await findUserByIdentifier(id)
  if (!user) {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }

  // Verify password if provided
  if (password) {
    const pwOk = await verifyPassword(password, user.password_hash)
    if (!pwOk) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }
  }

  // Mark email verified if register flow
  if (purpose === 'register' && !user.email_verified) {
    await getDB().prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(user.id).run()
  }

  const token = await createSessionToken(user.id)
  const res = NextResponse.json({
    token,
    user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name },
  }, { status: 200 })
  setSessionCookie(res, user.id)
  return res
}
