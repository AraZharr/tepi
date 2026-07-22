/**
 * Email domain reputation filter — anti-abuse (lihat diskusi NVIDIA-style).
 * Satu sumber kebenaran untuk server (API) dan client (UX instan).
 * Tidak mempublikasikan daftar secara eksplisit di UI.
 *
 * Kategori yang diblokir:
 * - Disposable / temp-mail (mailinator, guerrilla, dll)
 * - Domain tanpa MX / SPF / DKIM (reputasi rendah) — dicek opsional via DNS di masa depan
 *
 * Catatan: gmail/outlook/yahoo/icloud + domain .web.id/.id/.my.id umumnya lolos,
 * kecuali masuk blocklist di bawah.
 */

const DISPOSABLE_DOMAINS = new Set<string>([
  // --- Temp mail populer ---
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.com',
  'sharklasers.com', 'grr.la', 'pokemail.net', 'spam4.me', 'bccto.me', '10minutemail.com',
  '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'tmpmail.org', 'throwawaymail.com',
  'yopmail.com', 'yopmail.net', 'cool.fr.nf', 'jetable.org', 'nospam.ze.tc', 'mohmal.com',
  'mohmal.im', 'dispostable.com', 'fakeinbox.com', 'maildrop.cc', 'mailnesia.com', 'getnada.com',
  'nada.email', 'tempinbox.com', 'trashmail.com', 'trashmail.net', 'mailnull.com', 'spamgo.net',
  'spambog.com', 'spambog.ru', 'tempr.email', 'tempemail.co', 'tempr.email', 'emailondeck.com',
  'mintemail.com', 'tempemail.net', '10minmail.com', 'mailcatch.com', 'mailinator.net', 'mailinator.org',
  'mailinator2.com', 'mailinator.co', 'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'p33.org', 'zmoh.com', 'fakebox.net', 'mail-temporaire.fr', 'ephemail.net', 'disbox.net',
  'meltmail.com', 'burstmail.info', 'extendoffice.com', 'fakemailgenerator.com', 'emailfake.com',
  'fakemail.com', 'mailforspam.com', 'spamherelots.com', 'spam.la', 'spam.su', 'temporaryemail.net',
  'temp-mail.io', 'temp-mail.ru', 'tempmailo.com', 'throwawaymail.org', 'tmail.ws', 'wetrainbay.com',
  'yopmail.fr', 'yopmail.net', 'yopmail.org', 'mailcatch.com', 'guerrillamailblock.com',
  'mohmal.net', 'mohmal.uk', 'tempemail.co', 'tempinbox.co', 'mailnesia.org', 'mailnull.net',
  'spam4.me', 'spam4.me', 'grr.la', 'sharklasers.net', 'guerrillamail.io', 'guerrillamail.zone',
  'getnada.org', 'nada.email', 'tempmail.ws', 'tempmail.de', 'maildrop.cc', 'maildrop.ga',
  'kuro.web.id',
  // --- Generator / disposable tambahan ---
])

// Wildcard patterns (suffix match) — block semua subdomain di bawah domain ini
const DISPOSABLE_PATTERNS = [
  '.web.id',      // block semua *.web.id
  '.tk',          // block semua *.tk (Tokelau free domain)
  '.ml',          // block semua *.ml (Mali free domain)
  '.ga',          // block semua *.ga (Gabon free domain)
  '.cf',          // block semua *.cf (Central African Republic free domain)
  '.gq',          // block semua *.gq (Equatorial Guinea free domain)
]

const TRUSTED_DOMAINS = new Set<string>([
  'teleworm.us', 'armyspy.com', 'inboxbear.com', 'inboxbear.com', 'tempr.email', 'tmpmail.net',
  'tempmail.wtf', 'tempmail.dev', 'throwawaymail.co', 'disposablemail.com', 'fakedemail.com',
])

/** Domain yang selalu diizinkan (reputasi tinggi). */
const TRUSTED_DOMAINS = new Set<string>([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com',
  'proton.me', 'pm.me', 'gmx.com', 'gmx.net', 'zoho.com', 'aol.com', 'yandex.com',
])

export function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase().trim()
}

/**
 * Cek apakah email pakai domain disposable/temp-mail.
 * Return true = diblokir.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email)
  if (!domain) return false
  
  // Exact match check
  if (DISPOSABLE_DOMAINS.has(domain)) return true
  
  // Wildcard pattern check (suffix)
  for (const pattern of DISPOSABLE_PATTERNS) {
    if (domain.endsWith(pattern) || domain === pattern.slice(1)) {
      return true
    }
  }
  
  return false
}

export const EMAIL_DOMAIN_BLOCKED_MESSAGE =
  'Email dari domain ini tidak dapat digunakan. Gunakan email pribadi (Gmail, Outlook, Yahoo, iCloud, atau domain Anda sendiri).'
