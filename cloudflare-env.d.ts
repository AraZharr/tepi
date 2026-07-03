/// <reference types="@cloudflare/workers-types" />

/**
 * Type untuk Cloudflare environment bindings.
 * Binding D1 dikonfigurasi di wrangler.toml dan Cloudflare Pages dashboard.
 * Secret (API keys) dikonfigurasi di Cloudflare Pages → Settings → Environment Variables.
 */
interface CloudflareEnv {
  // D1 Database binding (nama harus sama dengan `binding` di wrangler.toml)
  DB: D1Database

  // Cloudflare DNS API
  CF_API_TOKEN: string
  CF_ZONE_ID: string
  CF_ACCOUNT_ID: string

  // Resend
  RESEND_API_KEY: string

  // Paywuz — pk_sand_... (sandbox) atau pk_live_... (produksi)
  // Signature webhook diverifikasi pakai key ini juga, tidak ada secret terpisah
  PAYWUZ_API_KEY: string

  // Admin
  ADMIN_USER_ID: string
}
