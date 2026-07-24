/**
 * Wrapper untuk Paywuz.id Merchant API v1 (QRIS & Virtual Account).
 * Dokumentasi resmi: https://paywuz.id/docs
 *
 * PENTING — kompatibilitas Edge Runtime (Cloudflare Pages):
 * File ini SENGAJA tidak memakai SDK resmi `paywuz-sdk` (Node.js only,
 * belum tentu kompatibel dengan Edge Runtime Cloudflare Workers).
 * Semua request dibuat langsung lewat `fetch`, dan verifikasi signature
 * webhook memakai Web Crypto API (`crypto.subtle`) — bukan modul
 * `node:crypto` — supaya jalan native tanpa bergantung ke nodejs_compat.
 *
 * Environment:
 *   PAYWUZ_API_KEY = pk_sand_... (sandbox, testing)  atau  pk_live_... (produksi nyata)
 *
 * Tidak ada PAYWUZ_WEBHOOK_SECRET terpisah — signature webhook diverifikasi
 * memakai PAYWUZ_API_KEY yang sama sebagai HMAC secret (lihat verifyWebhookSignature).
 */

const PAYWUZ_API = 'https://api.paywuz.id/v1'

function getHeaders() {
  const key = process.env.PAYWUZ_API_KEY
  if (!key) throw new Error('PAYWUZ_API_KEY missing')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaywuzErrorResponse {
  error: string
  message: string
}

export interface PaymentMethod {
  code: string // "QRIS" | "BNIVA" | "VA" (meta-method) | dst
  name: string
  type: 'qris' | 'virtual_account' | 'meta'
  fee: { flatIdr: number; percentBps: number }
  limits: { minIdr: number; maxIdr: number }
}

export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled'

export interface Transaction {
  id: string // UUID dari Paywuz
  orderId: string // ID yang kita kirim saat create
  amount: number
  totalPayment: number
  paymentMethod: string
  paymentNumber: string | null // QR string (QRIS) atau nomor VA; null untuk meta-method "VA" sebelum bank dipilih
  paymentUrl: string
  status: TransactionStatus
  paidAt?: string | null
  expiresAt: string
  createdAt: string
}

type Result<T> = { success: true; data: T } | { success: false; error: string }

async function parseResponse<T>(res: Response): Promise<Result<T>> {
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { /* not json */ }

  if (!res.ok) {
    const errMsg =
      (json && (json.message || json.error))
        ? `${json.error || 'error'}: ${json.message || json.error}`
        : `HTTP ${res.status}: ${text.slice(0, 200)}`
    return { success: false, error: errMsg }
  }
  if (!json?.data) {
    return { success: false, error: 'Paywuz response missing data field' }
  }
  return { success: true, data: json.data as T }
}

// ─── Daftar Metode Pembayaran ──────────────────────────────────────────────

/** GET /v1/payment-methods — ambil daftar metode aktif beserta biaya & limitnya */
export async function getPaymentMethods(): Promise<Result<PaymentMethod[]>> {
  const res = await fetch(`${PAYWUZ_API}/payment-methods`, { headers: getHeaders() })
  return parseResponse<PaymentMethod[]>(res)
}

// ─── Buat Transaksi ─────────────────────────────────────────────────────────

export interface CreateTransactionInput {
  orderId: string // unik per project, 1–64 karakter — idempotent (retry aman)
  amount: number // Rupiah, integer positif
  paymentMethod: string // "QRIS" untuk plan berbayar tepi.my.id
  expiryMinutes?: number // default QRIS: 60 menit
  redirectUrl?: string
  metadata?: Record<string, unknown>
}

/**
 * POST /v1/transactions — buat transaksi baru.
 * Idempotent: kalau `orderId` sudah pernah dipakai di project ini,
 * transaksi lama dikembalikan (HTTP 200) — bukan bikin duplikat.
 * Aman dipanggil ulang kalau ada retry di sisi kita.
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<Result<Transaction>> {
  const res = await fetch(`${PAYWUZ_API}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input),
  })
  return parseResponse<Transaction>(res)
}

/**
 * Shortcut untuk plan berbayar tepi.my.id — Rp5.000/tahun via QRIS.
 * orderId disertai timestamp supaya percobaan bayar ulang untuk subdomain
 * yang sama tidak bentrok dengan order lama yang sudah kedaluwarsa.
 */
export async function createSubdomainRenewalOrder(params: {
  subdomainId: number
  subdomainName: string
  userId: string
  amount?: number
  description?: string
}): Promise<Result<Transaction>> {
  const orderId = `tepi-${params.subdomainId}-${Date.now()}`
  const amount = params.amount || 5000

  return createTransaction({
    orderId,
    amount,
    paymentMethod: 'QRIS',
    metadata: {
      subdomainId: params.subdomainId,
      subdomainName: params.subdomainName,
      userId: params.userId,
    },
  })
}

// ─── Cek Status ─────────────────────────────────────────────────────────────

/**
 * GET /v1/transactions/:orderId
 * Utamakan webhook untuk update status secara real-time.
 * Endpoint ini untuk fallback atau konfirmasi ulang kalau ragu.
 */
export async function getTransactionStatus(orderId: string): Promise<Result<Transaction>> {
  const res = await fetch(`${PAYWUZ_API}/transactions/${encodeURIComponent(orderId)}`, {
    headers: getHeaders(),
  })
  return parseResponse<Transaction>(res)
}

// ─── Batalkan Transaksi ─────────────────────────────────────────────────────

/** POST /v1/transactions/:orderId/cancel — hanya transaksi berstatus 'pending' yang bisa dibatalkan */
export async function cancelTransaction(
  orderId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const res = await fetch(`${PAYWUZ_API}/transactions/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    headers: getHeaders(),
  })

  if (!res.ok) {
    const err = (await res.json()) as PaywuzErrorResponse
    return { success: false, error: `${err.error}: ${err.message}` }
  }
  return { success: true }
}

// ─── Webhook ────────────────────────────────────────────────────────────────

export interface WebhookPayload {
  event: 'transaction.paid' | 'transaction.failed' | 'transaction.cancelled'
  data: {
    id: string
    orderId: string
    amount: number
    fee: number
    totalPayment: number
    paymentMethod: string
    status: TransactionStatus
    paidAt: string | null
  }
  timestamp: string
}

/**
 * Verifikasi signature webhook Paywuz.
 *
 * Header: `X-Paywuz-Signature: sha256=<hex>`
 * Dihitung dari: HMAC-SHA256(rawBody, PAYWUZ_API_KEY)
 *
 * PENTING: `rawBody` harus STRING MENTAH dari request body,
 * diambil SEBELUM di-JSON.parse. Kalau body sudah diparse lalu
 * di-stringify ulang, signature tidak akan cocok (urutan key bisa berubah).
 *
 * Contoh pakai di API Route:
 *   const rawBody = await request.text()
 *   const valid = await verifyWebhookSignature(rawBody, request.headers.get('X-Paywuz-Signature'))
 *   if (!valid) return new Response('Invalid signature', { status: 401 })
 *   const payload = JSON.parse(rawBody) as WebhookPayload
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!signatureHeader) return false

  const apiKey = process.env.PAYWUZ_API_KEY
  if (!apiKey) return false

  const receivedHex = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))

  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return timingSafeEqualHex(expectedHex, receivedHex)
}

/** Perbandingan constant-time dua hex string — cegah timing attack */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// ─── Kalkulasi Fee (opsional, untuk preview UI) ─────────────────────────────

/**
 * fee = feeFlatIdr + ceil(amount × feePercentBps / 10000)
 * Nilai flatIdr/percentBps didapat dari getPaymentMethods().
 * Untuk QRIS Rp5.000 dengan fee tipikal (flat 290 + 0.7%):
 *   fee = 290 + ceil(5000 × 70 / 10000) = 290 + 35 = Rp325
 */
export function calculateFee(amount: number, feeFlatIdr: number, feePercentBps: number): number {
  return feeFlatIdr + Math.ceil((amount * feePercentBps) / 10000)
}
