/**
 * Email domain filter — whitelist only.
 * Domain di luar ALLOWED_DOMAINS / ALLOWED_SUFFIXES ditolak.
 * Satu sumber kebenaran server + client.
 */

/** Exact domain match (reputasi tinggi, consumer mail). */
const ALLOWED_DOMAINS = new Set<string>([
  // Google
  'gmail.com',
  'googlemail.com',
  // Microsoft
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'outlook.co.id',
  'hotmail.co.id',
  // Yahoo
  'yahoo.com',
  'yahoo.co.id',
  'ymail.com',
  // Apple
  'icloud.com',
  'me.com',
  'mac.com',
  // Proton
  'protonmail.com',
  'proton.me',
  'pm.me',
  // Lainnya umum
  'gmx.com',
  'gmx.net',
  'zoho.com',
  'aol.com',
  'yandex.com',
  'yandex.ru',
  'mail.com',
  'fastmail.com',
  'hey.com',
  'tutanota.com',
  'tuta.com',
])

/** Suffix yang diizinkan (domain custom institusi / ID). */
const ALLOWED_SUFFIXES = [
  '.edu',
  '.ac.id',
  '.sch.id',
  '.go.id',
  '.mil.id',
]

export function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase().trim()
}

/** true = domain diizinkan (lolos whitelist). */
export function isAllowedEmailDomain(email: string): boolean {
  const domain = getEmailDomain(email)
  if (!domain) return false
  if (ALLOWED_DOMAINS.has(domain)) return true
  for (const suffix of ALLOWED_SUFFIXES) {
    if (domain.endsWith(suffix)) return true
  }
  return false
}

/**
 * true = ditolak (bukan whitelist).
 * Nama tetap isDisposableEmail biar import lama gak pecah.
 */
export function isDisposableEmail(email: string): boolean {
  return !isAllowedEmailDomain(email)
}

export const EMAIL_DOMAIN_BLOCKED_MESSAGE =
  'Hanya email dari domain terpercaya yang diizinkan (Gmail, Outlook, Hotmail, Yahoo, iCloud, Proton, dll). Email sementara / domain lain tidak bisa dipakai.'
