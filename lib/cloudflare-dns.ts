/**
 * Wrapper untuk Cloudflare DNS API.
 * Digunakan saat user klaim, update, atau hapus subdomain.
 *
 * Dokumentasi API: https://developers.cloudflare.com/api/resources/dns/subresources/records/
 */

const CF_API = 'https://api.cloudflare.com/client/v4'

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export interface DNSRecordInput {
  type: 'A' | 'CNAME' | 'TXT'
  name: string    // nama subdomain lengkap, misal: "budi.tepi.my.id"
  content: string // IP address (untuk A), domain tujuan (untuk CNAME), atau value (untuk TXT)
  proxied?: boolean
  ttl?: number
}

export interface DNSRecordResult {
  id: string
  type: string
  name: string
  content: string
  proxied: boolean
}

/** Buat DNS record baru — dipanggil saat subdomain disetujui admin */
export async function createDNSRecord(
  record: DNSRecordInput
): Promise<{ success: boolean; result?: DNSRecordResult; error?: string }> {
  const res = await fetch(
    `${CF_API}/zones/${process.env.CF_ZONE_ID}/dns_records`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        proxied: ['TXT', 'CNAME'].includes(record.type) ? false : (record.proxied ?? true),  // TXT & CNAME gak bisa diproxy
        ttl: record.ttl ?? 1,            // 1 = automatic TTL
      }),
    }
  )

  const data = await res.json() as { success: boolean; result?: DNSRecordResult; errors?: { message: string }[] }
  if (!data.success) {
    return { success: false, error: data.errors?.[0]?.message ?? 'Unknown error' }
  }
  return { success: true, result: data.result }
}

/** Update DNS record yang sudah ada — saat user ganti target */
export async function updateDNSRecord(
  recordId: string,
  record: Partial<DNSRecordInput>
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${CF_API}/zones/${process.env.CF_ZONE_ID}/dns_records/${recordId}`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(record),
    }
  )

  const data = await res.json() as { success: boolean; errors?: { message: string }[] }
  if (!data.success) {
    return { success: false, error: data.errors?.[0]?.message ?? 'Unknown error' }
  }
  return { success: true }
}

/** Hapus DNS record — saat subdomain expired atau dihapus user */
export async function deleteDNSRecord(
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `${CF_API}/zones/${process.env.CF_ZONE_ID}/dns_records/${recordId}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  )

  const data = await res.json() as { success: boolean; errors?: { message: string }[] }
  if (!data.success) {
    return { success: false, error: data.errors?.[0]?.message ?? 'Unknown error' }
  }
  return { success: true }
}

/**
 * Vercel cross-account verify — is-a.dev style.
 * User paste: vc-domain-verify=<name>.tepi.my.id,<token>
 * We create TXT at _vercel.tepi.my.id (multi-TXT allowed on same name).
 */
export async function createVercelVerifyTXT(
  content: string
): Promise<{ success: boolean; result?: DNSRecordResult; error?: string; alreadyExists?: boolean }> {
  const zoneId = process.env.CF_ZONE_ID
  if (!zoneId) return { success: false, error: 'CF_ZONE_ID missing' }

  // Dedup: skip if same TXT already on _vercel
  const listRes = await fetch(
    `${CF_API}/zones/${zoneId}/dns_records?type=TXT&name=_vercel.tepi.my.id&per_page=100`,
    { headers: getHeaders() }
  )
  const listData = await listRes.json() as {
    success: boolean
    result?: { id: string; content: string }[]
  }
  if (listData.success && listData.result) {
    const exists = listData.result.find((r) => r.content === content || r.content === `"${content}"`)
    if (exists) {
      return {
        success: true,
        alreadyExists: true,
        result: { id: exists.id, type: 'TXT', name: '_vercel.tepi.my.id', content: exists.content, proxied: false },
      }
    }
  }

  return createDNSRecord({
    type: 'TXT',
    name: '_vercel.tepi.my.id',
    content,
    proxied: false,
  })
}
