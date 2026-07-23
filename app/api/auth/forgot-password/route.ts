import { NextResponse } from 'next/server'
import { issuePasswordReset } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 })
    }

    const result = await issuePasswordReset(email.toLowerCase().trim())
    
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Jika email terdaftar, link reset password akan dikirim' 
    })
  } catch (e: any) {
    console.error('[auth/forgot-password] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}