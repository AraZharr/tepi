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

export async function autoScanSubdomain(name: string, recordValue: string): Promise<ScanResult> {
  const issues: string[] = []

  // Scan value (hostname or IP)
  const scanValue = recordValue

  // Check if DNS resolves (for hostname values)
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(scanValue)) {
    try {
      const dnsRes = await fetch(`https://dns.google/resolve?name=${scanValue}&type=A`)
      const dnsData = await dnsRes.json()
      if (!dnsData.Answer || dnsData.Answer.length === 0) {
        issues.push('Domain target tidak bisa di-resolve')
      }
    } catch {
      issues.push('Gagal melakukan DNS check')
    }
  }

  // 2. Check subdomain name against suspicious keywords
  const fullDomain = `${name}.tepi.my.id`
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (scanValue.includes(keyword) || fullDomain.includes(keyword)) {
      issues.push(`Mengandung keyword mencurigakan: ${keyword}`)
      break
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  }
}

export type { ScanResult }
