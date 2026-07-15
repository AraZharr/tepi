/**
 * Validasi nama subdomain sebelum disimpan ke database dan Cloudflare.
 * Dipakai di client (form) maupun server (API route).
 */

import { isReserved } from './reserved'

const BLACKLIST = new Set([
  // Sistem & infrastruktur
  'www', 'api', 'admin', 'mail', 'ftp', 'smtp', 'pop', 'imap', 'ns', 'ns1', 'ns2',
  'dev', 'staging', 'test', 'preview', 'beta', 'alpha',

  // Halaman platform sendiri
  'login', 'signin', 'signup', 'register', 'logout', 'auth',
  'dashboard', 'panel', 'cpanel', 'settings', 'account', 'profile',
  'verify', 'verification', 'confirm', 'activate',
  'secure', 'security', 'safe', 'safety',
  'support', 'help', 'helpdesk', 'cs', 'contact',
  'status', 'monitor', 'health', 'ping', 'uptime',
  'blog', 'docs', 'documentation', 'wiki', 'forum',
  'payment', 'billing', 'pay', 'checkout', 'invoice', 'subscribe',
  'abuse', 'report', 'legal', 'terms', 'privacy', 'policy',
  'noreply', 'no-reply', 'postmaster', 'webmaster',

  // Brand terkenal (Indonesia + global)
  'paypal', 'bank', 'gov', 'government',
  'bca', 'bri', 'bni', 'mandiri', 'bsm', 'cimb', 'ocbc', 'danamon', 'permata',
  'gojek', 'grab', 'shopee', 'tokopedia', 'bukalapak', 'traveloka', 'blibli',
  'lazada', 'zalora', 'jd', 'alibaba', 'aliexpress',
  'netflix', 'spotify', 'youtube', 'tiktok', 'instagram', 'facebook',
  'twitter', 'x', 'whatsapp', 'telegram', 'discord', 'slack',
  'google', 'gmail', 'googledrive', 'microsoft', 'apple', 'amazon', 'aws',
])

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateSubdomainName(name: string): ValidationResult {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Nama subdomain wajib diisi.' }
  }

  const trimmed = name.trim().toLowerCase()

  if (trimmed.length < 3) {
    return { valid: false, error: 'Minimal 3 karakter.' }
  }

  if (trimmed.length > 63) {
    return { valid: false, error: 'Maksimal 63 karakter.' }
  }

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Hanya huruf kecil (a-z), angka (0-9), dan tanda hubung (-) yang diizinkan.',
    }
  }

  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return { valid: false, error: 'Tidak boleh diawali atau diakhiri tanda hubung.' }
  }

  if (trimmed.includes('--') && !trimmed.startsWith('xn--')) {
    return { valid: false, error: 'Tidak boleh mengandung dua tanda hubung berurutan.' }
  }

  if (BLACKLIST.has(trimmed)) {
    return { valid: false, error: 'Nama ini tidak tersedia.' }
  }

  if (isReserved(trimmed)) {
    return { valid: false, error: 'Nama ini tidak tersedia.' }
  }

  return { valid: true }
}

/** Validasi URL target (CNAME atau A record) */
export function validateTargetURL(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL target wajib diisi.' }
  }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL harus diawali https:// atau http://' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Format URL tidak valid.' }
  }
}

/** Validasi IP address untuk A record */
export function validateIPAddress(ip: string): ValidationResult {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!ipv4Regex.test(ip)) {
    return { valid: false, error: 'Format IP address tidak valid.' }
  }

  const parts = ip.split('.').map(Number)
  if (parts.some((part) => part > 255)) {
    return { valid: false, error: 'Nilai oktet IP tidak valid (maks 255).' }
  }

  return { valid: true }
}
