import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth'

export async function POST() {
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  // Also clear legacy cookie names if any remain
  res.cookies.set('session', '', { path: '/', maxAge: 0 })
  res.cookies.set('session.sig', '', { path: '/', maxAge: 0 })
  return res
}
