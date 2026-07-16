import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { sendEmail } from '@/lib/email'

const SESSION_COOKIE = 'tepi_session'
const OTP_TTL_MS = 10 * 60 * 1000
const SESSION_TTL_SEC = 60 * 60 * 24 * 30

export type AuthUser = {
  id: string
  email: string
  username: string | null
  full_name: string | null
  role: string
  subdomain_limit: number
  email_verified: number
}

function authSecret() {
  const s = process.env.AUTH_SECRET || process.env.JWT_SECRET
  if (!s) throw new Error('AUTH_SECRET belum di-set')
  return s
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Buffer.from(sig).toString('base64url')
}

export async function hashPassword(password: string) {
  const salt = crypto.randomUUID().replace(/-/g, '')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  )
  return `${salt}:${Buffer.from(bits).toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  )
  return Buffer.from(bits).toString('hex') === hash
}

export async function createSessionToken(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC
  const payload = `${userId}.${exp}`
  const sig = await hmac(payload)
  return `${payload}.${sig}`
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, expStr, sig] = parts
  const exp = Number(expStr)
  if (!userId || !exp || exp * 1000 < Date.now()) return null
  const expected = await hmac(`${userId}.${expStr}`)
  if (sig !== expected) return null
  return { userId }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export async function setSessionCookie(res: NextResponse, userId: string) {
  const token = await createSessionToken(userId)
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  return token
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const parsed = await verifySessionToken(token)
  if (!parsed) return null

  const db = await getDB()
  const user = await db
    .prepare(
      `SELECT id, email, username, full_name, role, subdomain_limit, email_verified
       FROM users WHERE id = ? AND is_suspended = 0`
    )
    .bind(parsed.userId)
    .first<AuthUser>()
  return user ?? null
}

export async function requireUser(): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return user
}

export function isAuthUser(v: AuthUser | NextResponse): v is AuthUser {
  return !(v instanceof NextResponse)
}

function otpCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function issueOtp(email: string, purpose: 'register' | 'login') {
  const db = await getDB()
  const code = otpCode()
  const codeHash = await hmac(`${email}:${purpose}:${code}`)
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()

  await db.prepare(`DELETE FROM auth_otps WHERE email = ? AND purpose = ?`).bind(email, purpose).run()
  await db
    .prepare(
      `INSERT INTO auth_otps (email, purpose, code_hash, expires_at, attempts)
       VALUES (?, ?, ?, ?, 0)`
    )
    .bind(email, purpose, codeHash, expiresAt)
    .run()

  const subject =
    purpose === 'register'
      ? 'Kode verifikasi daftar tepi.my.id'
      : 'Kode OTP login tepi.my.id'

  await sendEmail({
    to: email,
    subject,
    html: `
      <p>Kode OTP kamu: <strong style="font-size:20px;letter-spacing:4px">${code}</strong></p>
      <p>Berlaku 10 menit. Jangan bagikan ke siapa pun.</p>
    `,
  })

  return { expiresAt }
}

export async function consumeOtp(email: string, purpose: 'register' | 'login', code: string) {
  const db = await getDB()
  const row = await db
    .prepare(
      `SELECT id, code_hash, expires_at, attempts FROM auth_otps
       WHERE email = ? AND purpose = ? ORDER BY id DESC LIMIT 1`
    )
    .bind(email, purpose)
    .first<{ id: number; code_hash: string; expires_at: string; attempts: number }>()

  if (!row) return { ok: false as const, error: 'OTP tidak ditemukan. Minta kode baru.' }
  if (row.attempts >= 5) return { ok: false as const, error: 'Terlalu banyak percobaan. Minta kode baru.' }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false as const, error: 'OTP kedaluwarsa. Minta kode baru.' }
  }

  const expected = await hmac(`${email}:${purpose}:${code}`)
  if (expected !== row.code_hash) {
    await db.prepare(`UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?`).bind(row.id).run()
    return { ok: false as const, error: 'Kode OTP salah' }
  }

  await db.prepare(`DELETE FROM auth_otps WHERE email = ? AND purpose = ?`).bind(email, purpose).run()
  return { ok: true as const }
}

export async function findUserByIdentifier(identifier: string) {
  const db = await getDB()
  const id = identifier.trim()
  return db
    .prepare(
      `SELECT id, email, username, full_name, password_hash, role, subdomain_limit, email_verified, is_suspended
       FROM users WHERE email = ? OR username = ? LIMIT 1`
    )
    .bind(id, id)
    .first<{
      id: string
      email: string
      username: string | null
      full_name: string | null
      password_hash: string
      role: string
      subdomain_limit: number
      email_verified: number
      is_suspended: number
    }>()
}
