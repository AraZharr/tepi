import { NextResponse } from 'next/server'

export async function POST() {
  const results: string[] = []
  const errors: string[] = []

  // Test 1: crypto.randomUUID
  try {
    const uuid = crypto.randomUUID()
    results.push(`uuid: ${uuid}`)
  } catch (e: any) {
    errors.push(`crypto.randomUUID: ${e.message}`)
  }

  // Test 2: crypto.subtle + PBKDF2 (quick)
  try {
    const salt = crypto.randomUUID().replace(/-/g, '')
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode('testpass'),
      'PBKDF2', false, ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 1000, hash: 'SHA-256' },
      key, 256
    )
    results.push(`pbkdf2 fast: ok (${bits.byteLength} bytes)`)
  } catch (e: any) {
    errors.push(`PBKDF2 fast: ${e.message}`)
  }

  // Test 3: Buffer
  try {
    const b = Buffer.from('hello')
    results.push(`Buffer: ${b.toString('hex')}`)
  } catch (e: any) {
    errors.push(`Buffer: ${e.message}`)
  }

  // Test 4: AUTH_SECRET
  try {
    const s = process.env.AUTH_SECRET
    results.push(`AUTH_SECRET: ${s ? s.slice(0, 8) + '...' : 'MISSING'}`)
  } catch (e: any) {
    errors.push(`AUTH_SECRET: ${e.message}`)
  }

  // Test 5: D1
  try {
    const { getDB } = await import('@/lib/db')
    const db = await getDB()
    const r = await db.prepare('SELECT 1 as ok').first()
    results.push(`D1: ${JSON.stringify(r)}`)
  } catch (e: any) {
    errors.push(`D1: ${e.message}`)
  }

  // Test 6: findUserByIdentifier
  try {
    const { findUserByIdentifier } = await import('@/lib/auth')
    const u = await findUserByIdentifier('test@example.com')
    results.push(`findUser(test): ${u ? 'found' : 'not found'}`)
  } catch (e: any) {
    errors.push(`findUser: ${e.message}`)
  }

  // Test 7: fetch DNS
  try {
    const resp = await fetch('https://cloudflare-dns.com/dns-query?name=gmail.com&type=MX', {
      method: 'GET', headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5000),
    })
    const txt = await resp.text()
    results.push(`fetch dns: status=${resp.status} len=${txt.length}`)
  } catch (e: any) {
    errors.push(`fetch dns: ${e.message}`)
  }

  // Test 8: hashPassword with full 100k iterations
  try {
    const { hashPassword } = await import('@/lib/auth')
    const start = Date.now()
    const hash = await hashPassword('testpassword123')
    const elapsed = Date.now() - start
    results.push(`hashPassword: ${hash.slice(0, 20)}... (${elapsed}ms)`)
  } catch (e: any) {
    errors.push(`hashPassword: ${e.message}`)
  }

  // Test 9: isDisposableEmail
  try {
    const { isDisposableEmail } = await import('@/lib/temp-mail')
    results.push(`isDisposable(gmail): ${isDisposableEmail('x@gmail.com')}`)
  } catch (e: any) {
    errors.push(`disposable: ${e.message}`)
  }

  // Test 10: createSessionToken
  try {
    const { createSessionToken } = await import('@/lib/auth')
    const token = await createSessionToken('test-user-id-12345')
    results.push(`sessionToken: ${token.slice(0, 30)}...`)
  } catch (e: any) {
    errors.push(`sessionToken: ${e.message}`)
  }

  // Test 11: issueOtp (no email send - uses catch)
  try {
    const { issueOtp } = await import('@/lib/auth')
    // Use a unique email to avoid conflicts
    const otpResult = await issueOtp(`diag-${Date.now()}@test.tepi.my.id`, 'register')
    results.push(`issueOtp: expires=${otpResult.expiresAt}`)
  } catch (e: any) {
    errors.push(`issueOtp: ${e.message}`)
  }

  return NextResponse.json({ results, errors, ok: errors.length === 0 })
}
