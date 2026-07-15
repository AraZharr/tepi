/**
 * Simple auto-scan untuk subdomain baru.
 * Cek: DNS resolve, HTTP status, blocklist keywords
 */

interface ScanResult {
  passed: boolean
  issues: string[]
}

const SUSPICIOUS_KEYWORDS = [
  'phishing', 'login', 'bank', 'verify', 'account', 'secure',
  'update', 'confirm', 'password', 'credit', 'card', 'paypal',
  'free', 'prize', 'winner', 'lottery', 'casino', 'crypto',
]

export async function autoScanSubdomain(name: string, targetUrl: string): Promise<ScanResult> {
  const issues: string[] = []

  // 1. URL validation — check if it resolves
  try {
    const url = new URL(targetUrl)
    const hostname = url.hostname

    // Check if hostname resolves
    try {
      const dnsRes = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`)
      const dnsData = await dnsRes.json()
      if (!dnsData.Answer || dnsData.Answer.length === 0) {
        issues.push('Domain target tidak bisa di-resolve')
      }
    } catch {
      issues.push('Gagal melakukan DNS check')
    }

    // 2. HTTP status check (kalo bisa diakses)
    try {
      const httpRes = await fetch(targetUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      const status = httpRes.status
      if (status >= 400 && status !== 403 && status !== 401) {
        issues.push(`Target mengembalikan HTTP ${status}`)
      }
    } catch {
      // timeout/network error — not necessarily bad, skip
    }

    // 3. Check target domain against suspicious keywords
    const fullDomain = `${name}.tepi.my.id`
    for (const keyword of SUSPICIOUS_KEYWORDS) {
      if (hostname.includes(keyword) || targetUrl.toLowerCase().includes(keyword)) {
        issues.push(`Mengandung keyword mencurigakan: ${keyword}`)
        break
      }
    }

    // 4. Check if target is a known IP (direct IP usage can be suspicious)
    const ipMatch = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)
    if (ipMatch) {
      issues.push('Target berupa IP langsung (bukan domain) — flag untuk review')
    }

  } catch {
    issues.push('URL target tidak valid')
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}
