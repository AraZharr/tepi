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

  // Test 2: crypto.subtle + PBKDF2
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
    results.push(`pbkdf2: ok (${bits.byteLength} bytes)`)
  } catch (e: any) {
    errors.push(`PBKDF2: ${e.message}`)
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
    results.push(`findUser: ${u ? 'found' : 'not found'}`)
  } catch (e: any) {
    errors.push(`findUser: ${e.message}`)
  }

  return NextResponse.json({ results, errors, ok: errors.length === 0 })
}
