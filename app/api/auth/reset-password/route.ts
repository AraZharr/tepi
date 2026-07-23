import { NextResponse } from 'next/server'
import { consumePasswordReset, hashPassword } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json()
    
    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
    }
    
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }

    const result = await consumePasswordReset(email.toLowerCase().trim(), token, password)
    
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password berhasil diubah. Silakan login.' 
    })
  } catch (e: any) {
    console.error('[auth/reset-password] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}