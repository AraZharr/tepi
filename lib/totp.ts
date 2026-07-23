/**
 * TOTP (Time-based One-Time Password) for 2FA
 * RFC 6238 compliant implementation using Web Crypto API
 * Works in Edge Runtime (Cloudflare Workers)
 */

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const BASE32_MAP: Record<string, number> = {}
for (let i = 0; i < BASE32_CHARS.length; i++) {
  BASE32_MAP[BASE32_CHARS[i]] = i
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      output += BASE32_CHARS[(value >> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31]
  }

  while (output.length % 8 !== 0) {
    output += '='
  }

  return output
}

export function base32Decode(str: string): Uint8Array {
  str = str.replace(/=/g, '').toUpperCase()
  const bytes: number[] = []
  let bits = 0
  let value = 0

  for (const char of str) {
    const val = BASE32_MAP[char]
    if (val === undefined) throw new Error(`Invalid base32 character: ${char}`)
    value = (value << 5) | val
    bits += 5

    if (bits >= 8) {
      bytes.push((value >> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return new Uint8Array(bytes)
}

/**
 * Generate a random TOTP secret (160 bits = 20 bytes)
 */
export function generateTotpSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return base32Encode(bytes)
}

/**
 * Generate otpauth:// URI for QR code
 */
export function generateOtpAuthUri(secret: string, email: string, issuer = 'tepi.my.id'): string {
  const label = `${issuer}:${email}`
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Generate backup codes (8 codes, 8 chars each)
 */
export function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase()
  )
}

/**
 * Hash a backup code for storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  // Use simple hash for backup codes (not PBKDF2 since they're random)
  const encoder = new TextEncoder()
  const data = encoder.encode(code + 'tepi-backup-salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify a backup code against stored hash
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  const computed = await hashBackupCode(code)
  return computed === hash
}

/**
 * Verify TOTP code against secret
 * Checks current, previous, and next period for clock skew tolerance
 */
export async function verifyTotpCode(secret: string, code: string, tolerance = 1): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)
  const period = 30
  const counter = Math.floor(now / period)

  for (let i = -tolerance; i <= tolerance; i++) {
    const expected = await generateTotpCode(secret, counter + i)
    if (expected === code) return true
  }

  return false
}

/**
 * Generate TOTP code for a given counter
 */
async function generateTotpCode(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const counterBytes = new ArrayBuffer(8)
  const view = new DataView(counterBytes)
  view.setUint32(4, counter) // Big-endian, only low 32 bits

  const hmac = await crypto.subtle.sign('HMAC', key, counterBytes)
  const hmacBytes = new Uint8Array(hmac)

  // Dynamic truncation (RFC 4226)
  const offset = hmacBytes[19] & 0xf
  const code = (
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)
  ) % 1_000_000

  return code.toString().padStart(6, '0')
}