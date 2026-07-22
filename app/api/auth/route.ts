import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDB } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken, setSessionCookie, clearSessionCookie, getSessionUser, requireUser, issueOtp, consumeOtp, findUserByIdentifier } from '@/lib/auth'
import { isDisposableEmail, EMAIL_DOMAIN_BLOCKED_MESSAGE } from '@/lib/temp-mail'

async function validateDomainHasMX(domain: string): Promise<boolean> {
  // DoH via cloudflare-dns.com — raw 1.1.1.10 IP often fails TLS from Workers
  const resolvers = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
    `https://1.1.1.1/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
  ]
  for (const url of resolvers) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2500)
      const resp = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/dns-json' },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!resp.ok) continue
      const json = await resp.json() as { Answer?: unknown[] }
      if (Array.isArray(json.Answer) && json.Answer.length > 0) return true
    } catch {
      // try next resolver
    }
  }
  return false
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8)
  console.log(`[auth] POST ${requestId} start`)
  try {
    const body: any = await request.json()
    console.log(`[auth] ${requestId} body parsed`, { email: body?.email?.slice(0, 10) + '...' })
    const { email, password, username, fullName } = body

    if (!email || typeof email !== 'string') {
      console.log(`[auth] ${requestId} 400 email required`)
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
    }

    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase().trim()
    console.log(`[auth] ${requestId} domain: ${domain}`)

    const user = await findUserByIdentifier(email)
    console.log(`[auth] ${requestId} user found:`, !!user)
    if (user) {
      if (user.is_suspended) return NextResponse.json({ error: 'Akun sedang di-suspend' }, { status: 403 })
      if (!user.email_verified) return NextResponse.json({ error: 'Email belum diverifikasi' }, { status: 403 })
      if (!(await verifyPassword(password, user.password_hash))) return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    } else {
      if (isDisposableEmail(email)) return NextResponse.json({ error: EMAIL_DOMAIN_BLOCKED_MESSAGE }, { status: 403 })
      const hasMX = await validateDomainHasMX(domain)
      console.log(`[auth] ${requestId} hasMX: ${hasMX}`)
      if (!hasMX) return NextResponse.json({ error: 'Domain email tidak valid atau tidak memiliki record penerimaan email (MX).' }, { status: 403 })

      const passwordHash = await hashPassword(password)
      const userId = crypto.randomUUID()

      await getDB().prepare(
        `INSERT INTO users (id, email, username, full_name, password_hash, role, subdomain_limit, email_verified)
         VALUES (?, ?, ?, ?, ?, 'user', 2, 0)`
      ).bind(userId, email, username, fullName, passwordHash).run()
      console.log(`[auth] ${requestId} user inserted`)

      await issueOtp(email, 'register')
      console.log(`[auth] ${requestId} otp issued`)
      return NextResponse.json({ message: 'Kami telah mengirim OTP ke email kamu' }, { status: 201 })
    }

    const token = await createSessionToken(user.id)
    const res = NextResponse.json({ token, user: { id: user.id, email, username, full_name: user.full_name, role: user.role } }, { status: 201 })
    setSessionCookie(res, user.id)
    console.log(`[auth] ${requestId} success`)
    return res
  } catch (err: any) {
    console.error(`[auth] POST error:`, err?.message, err?.stack)
    return NextResponse.json({ error: 'Terjadi kesalahan server. Coba lagi.' }, { status: 500 })
  }
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
  const res = NextResponse.json({ token, user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name, role: user.role } }, { status: 200 })
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