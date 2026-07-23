import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { generateTotpSecret, generateOtpAuthUri, generateBackupCodes, hashBackupCode, verifyTotpCode, verifyBackupCode } from '@/lib/totp'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDB()
  const userRecord = await db.prepare(
    'SELECT totp_enabled, totp_secret FROM users WHERE id = ?'
  ).bind(user.id).first() as { totp_enabled: number; totp_secret: string } | null

  return NextResponse.json({
    enabled: userRecord?.totp_enabled === 1,
    // Don't return secret if already enabled
  })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, code, password } = body

  const db = await getDB()
  const userRecord = await db.prepare(
    'SELECT totp_enabled, totp_secret, password_hash FROM users WHERE id = ?'
  ).bind(user.id).first() as { totp_enabled: number; totp_secret: string; password_hash: string } | null

  // Verify password for sensitive actions
  if (action !== 'setup' && password) {
    const { verifyPassword } = await import('@/lib/auth')
    if (!await verifyPassword(password, userRecord?.password_hash || '')) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }
  }

  switch (action) {
    case 'setup': {
      if (userRecord?.totp_enabled) {
        return NextResponse.json({ error: '2FA sudah diaktifkan' }, { status: 400 })
      }

      const secret = generateTotpSecret()
      const otpAuthUrl = generateOtpAuthUri(secret, user.email)
      const backupCodes = generateBackupCodes()

      // Store secret temporarily (not enabled yet)
      await db.prepare(
        'UPDATE users SET totp_secret = ? WHERE id = ?'
      ).bind(secret, user.id).run()

      return NextResponse.json({
        secret,
        otpAuthUrl,
        backupCodes,
      })
    }

    case 'enable': {
      if (!code) return NextResponse.json({ error: 'Kode 2FA wajib diisi' }, { status: 400 })

      const secret = userRecord?.totp_secret
      if (!secret) return NextResponse.json({ error: 'Setup 2FA dulu' }, { status: 400 })

      const valid = await verifyTotpCode(secret, code)
      if (!valid) return NextResponse.json({ error: 'Kode 2FA tidak valid' }, { status: 400 })

      // Hash backup codes for storage
      const backupCodes = generateBackupCodes()
      const hashedBackups = await Promise.all(backupCodes.map(c => hashBackupCode(c)))

      await db.prepare(
        'UPDATE users SET totp_enabled = 1, backup_codes = ? WHERE id = ?'
      ).bind(JSON.stringify(hashedBackups), user.id).run()

      return NextResponse.json({ 
        success: true, 
        backupCodes,
        message: '2FA diaktifkan! Simpan backup codes dengan aman.'
      })
    }

    case 'disable': {
      if (!userRecord?.totp_enabled) {
        return NextResponse.json({ error: '2FA tidak aktif' }, { status: 400 })
      }

      if (!code) return NextResponse.json({ error: 'Kode 2FA wajib diisi' }, { status: 400 })

      const valid = await verifyTotpCode(userRecord.totp_secret, code)
      if (!valid) return NextResponse.json({ error: 'Kode 2FA tidak valid' }, { status: 400 })

      await db.prepare(
        'UPDATE users SET totp_enabled = 0, totp_secret = NULL, backup_codes = NULL WHERE id = ?'
      ).bind(user.id).run()

      return NextResponse.json({ success: true, message: '2FA dinonaktifkan' })
    }

    case 'verify': {
      if (!userRecord?.totp_enabled) {
        return NextResponse.json({ ok: true })
      }

      if (!code) return NextResponse.json({ error: 'Kode 2FA wajib diisi' }, { status: 400 })

      const valid = await verifyTotpCode(userRecord.totp_secret, code)
      if (valid) return NextResponse.json({ ok: true })

      // Try backup codes
      const backupCodes = userRecord.backup_codes ? JSON.parse(userRecord.backup_codes as string) : []
      for (const hashed of backupCodes) {
        if (await verifyBackupCode(code, hashed)) {
          // Remove used backup code
          const remaining = backupCodes.filter(h => h !== hashed)
          await db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?')
            .bind(JSON.stringify(remaining), user.id).run()
          return NextResponse.json({ ok: true, usedBackup: true })
        }
      }

      return NextResponse.json({ error: 'Kode tidak valid' }, { status: 400 })
    }

    default:
      return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  }
}