import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDB } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken, setSessionCookie, clearSessionCookie, getSessionUser, requireUser, issueOtp, consumeOtp, findUserByIdentifier } from '@/lib/auth'
import { isDisposableEmail, EMAIL_DOMAIN_BLOCKED_MESSAGE } from '@/lib/temp-mail'

async function validateDomainHasMX(domain: string): Promise<boolean> {
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
  const rid = crypto.randomUUID().slice(0, 8)
  const steps: string[] = []
  try {
    steps.push('parse-body')
    const body: any = await request.json()
    const { email, password, username, fullName } = body
    steps.push('got-email:' + email)

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
    }

    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase().trim()
    steps.push('domain:' + domain)

    steps.push('findUser')
    const user = await findUserByIdentifier(email)
    steps.push('user:' + (user ? 'found' : 'new'))

    if (user) {
      // Existing user — login path
      if (user.is_suspended) return NextResponse.json({ error: 'Akun sedang di-suspend' }, { status: 403 })
      if (!user.email_verified) {
        // Unverified user: resend OTP instead of creating new record
        steps.push('unverified-resend-otp')
        await issueOtp(email, 'register')
        return NextResponse.json({ message: 'Kode OTP baru telah dikirim ke email kamu. Verifikasi akun kamu untuk melanjutkan.' }, { status: 200 })
      }
      steps.push('verifyPassword')
      if (!(await verifyPassword(password, user.password_hash))) return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    } else {
      steps.push('isDisposable')
      if (isDisposableEmail(email)) return NextResponse.json({ error: EMAIL_DOMAIN_BLOCKED_MESSAGE }, { status: 403 })

      steps.push('hasMX')
      const hasMX = await validateDomainHasMX(domain)
      steps.push('hasMX:' + hasMX)
      if (!hasMX) return NextResponse.json({ error: 'Domain email tidak valid atau tidak memiliki record penerimaan email (MX).' }, { status: 403 })

      steps.push('hashPassword')
      const passwordHash = await hashPassword(password)
      steps.push('hashOK')

      const db = await getDB()

      // Check username uniqueness before insert
      const existingUsername = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
      if (existingUsername) {
        return NextResponse.json({ error: 'Username telah digunakan' }, { status: 400 })
      }

      const userId = crypto.randomUUID()
      steps.push('insert')

      await db.prepare(
        `INSERT INTO users (id, email, username, full_name, password_hash, role, subdomain_limit, email_verified)
         VALUES (?, ?, ?, ?, ?, 'user', 2, 0)`
      ).bind(userId, email, username, fullName, passwordHash).run()
      steps.push('inserted')

      steps.push('issueOtp')
      await issueOtp(email, 'register')
      steps.push('otpSent')
      return NextResponse.json({ message: 'Kami telah mengirim OTP ke email kamu' }, { status: 201 })
    }

    const token = await createSessionToken(user.id)
    const res = NextResponse.json({ token, user: { id: user.id, email, username, full_name: user.full_name, role: user.role } }, { status: 201 })
    setSessionCookie(res, user.id)
    steps.push('success')
    return res
  } catch (err: any) {
    console.error(`[auth] POST ${rid} error:`, err?.message, err?.stack)
    return NextResponse.json({ error: 'Terjadi kesalahan server. Coba lagi.', _debug: rid, steps, detail: err?.message || String(err) }, { status: 500 })
  }
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user })
}

export async function PUT(request: Request) {
  try {
    const body: any = await request.json()
    const { code, identifier, password } = body

    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'OTP wajib diisi' }, { status: 400 })
    if (!identifier || typeof identifier !== 'string') return NextResponse.json({ error: 'Email/Username wajib diisi' }, { status: 400 })
    if (!password || typeof password !== 'string' || password.length < 6) return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })

    const result = await consumeOtp(identifier, 'login', code)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    const user = await findUserByIdentifier(identifier)
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
    if (user.is_suspended) return NextResponse.json({ error: 'Akun sedang di-suspend' }, { status: 403 })
    if (!user.email_verified) return NextResponse.json({ error: 'Email belum diverifikasi' }, { status: 403 })
    if (!verifyPassword(password, user.password_hash)) return NextResponse.json({ error: 'Password salah' }, { status: 401 })

    const token = await createSessionToken(user.id)
    const res = NextResponse.json({ token, user: { id: user.id, email: user.email, username: user.username, full_name: user.full_name, role: user.role } }, { status: 200 })
    setSessionCookie(res, user.id)
    return res
  } catch (err: any) {
    console.error('[auth] PUT error:', err?.message)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  clearSessionCookie(NextResponse.json({ ok: true }, { status: 200 }))
  return NextResponse.json({ ok: true }, { status: 200 })
}
