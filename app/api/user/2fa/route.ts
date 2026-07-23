import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { generateTotpSecret, generateOtpAuthUri, generateBackupCodes, hashBackupCode, verifyTotpCode, verifyBackupCode } from '@/lib/totp'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getDB()
  const row = await db.prepare(
    `SELECT totp_secret, totp_enabled FROM users WHERE id = ?`
  ).bind(user.id).first() as { totp_secret: string | null; totp_enabled: number } | null

  return NextResponse.json({
    enabled: row?.totp_enabled === 1,
    secret: row?.totp_enabled ? null : (row?.totp_secret || null),
  })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, code, password } = body

  const db = await getDB()

  if (action === 'setup') {
    const row = await db.prepare(
      `SELECT totp_enabled FROM users WHERE id = ?`
    ).bind(user.id).first() as { totp_enabled: number } | null

    if (row?.totp_enabled) {
      return NextResponse.json({ error: '2FA sudah aktif' }, { status: 400 })
    }

    const secret = generateTotpSecret()
    const otpAuthUrl = generateOtpAuthUri(secret, user.email)
    const backupCodes = generateBackupCodes()

    await db.prepare(
      `UPDATE users SET totp_secret = ? WHERE id = ?`
    ).bind(secret, user.id).run()

    return NextResponse.json({ secret, otpAuthUrl, backupCodes })
  }

  if (action === 'enable') {
    if (!code) return NextResponse.json({ error: 'Kode 2FA wajib diisi' }, { status: 400 })

    const row = await db.prepare(
      `SELECT totp_secret FROM users WHERE id = ?`
    ).bind(user.id).first() as { totp_secret: string | null } | null

    if (!row?.totp_secret) {
      return NextResponse.json({ error: 'Setup 2FA dulu' }, { status: 400 })
    }

    const valid = await verifyTotpCode(row.totp_secret, code)
    if (!valid) return NextResponse.json({ error: 'Kode 2FA tidak valid' }, { status: 400 })

    const backupCodes = generateBackupCodes()
    const hashedBackups = await Promise.all(backupCodes.map(c => hashBackupCode(c)))

    await db.prepare(
      `UPDATE users SET totp_enabled = 1, backup_codes = ? WHERE id = ?`
    ).bind(JSON.stringify(hashedBackups), user.id).run()

    return NextResponse.json({ success: true, backupCodes })
  }

  if (action === 'disable') {
    if (!code) return NextResponse.json({ error: 'Kode 2FA wajib diisi' }, { status: 400 })

    const row = await db.prepare(
      `SELECT totp_secret, backup_codes, password_hash FROM users WHERE id = ?`
    ).bind(user.id).first() as { totp_secret: string | null; backup_codes: string | null; password_hash: string } | null

    if (!row?.totp_enabled) {
      return NextResponse.json({ error: '2FA tidak aktif' }, { status: 400 })
    }

    let valid = false

    if (row?.totp_secret) {
      valid = await verifyTotpCode(row.totp_secret, code)
    }

    if (!valid && row?.backup_codes) {
      const codes = JSON.parse(row.backup_codes) as string[]
      for (const hashed of codes) {
        if (await verifyBackupCode(code, hashed)) {
          valid = true
          // Remove used backup code
          const remaining = codes.filter(h => h !== hashed)
          await db.prepare(`UPDATE users SET backup_codes = ? WHERE id = ?`)
            .bind(JSON.stringify(remaining), user.id).run()
          break
        }
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Kode 2FA atau backup code salah' }, { status: 400 })
    }

    // Verify password too
    if (password) {
      const { verifyPassword } = await import('@/lib/auth')
      if (!await verifyPassword(password, row.password_hash)) {
        return NextResponse.json({ error: 'Password salah' }, { status: 401 })
      }
    }

    await db.prepare(
      `UPDATE users SET totp_enabled = 0, totp_secret = NULL, backup_codes = NULL WHERE id = ?`
    ).bind(user.id).run()

    return NextResponse.json({ success: true })
  }

  if (action === 'verify') {
    const row = await db.prepare(
      `SELECT totp_secret, totp_enabled, backup_codes FROM users WHERE id = ?`
    ).bind(user.id).first() as { totp_secret: string | null; totp_enabled: number; backup_codes: string | null } | null

    if (!row?.totp_enabled) {
      return NextResponse.json({ ok: true })
    }

    if (!code) return NextResponse.json({ error: 'Kode 2FA wajib diisi' }, { status: 400 })

    let valid = false
    if (row?.totp_secret) {
      valid = await verifyTotpCode(row.totp_secret, code)
    }

    if (valid) return NextResponse.json({ ok: true })

    // Try backup codes
    if (row?.backup_codes) {
      const codes = JSON.parse(row.backup_codes) as string[]
      for (const hashed of codes) {
        if (await verifyBackupCode(code, hashed)) {
          const remaining = codes.filter(h => h !== hashed)
          await db.prepare(`UPDATE users SET backup_codes = ? WHERE id = ?`)
            .bind(JSON.stringify(remaining), user.id).run()
          return NextResponse.json({ ok: true, usedBackup: true })
        }
      }
    }

    return NextResponse.json({ error: 'Kode tidak valid' }, { status: 400 })
  }

  return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
}