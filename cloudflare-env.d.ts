/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  AUTH_SECRET: string
  CF_API_TOKEN: string
  CF_ZONE_ID: string
  CF_ACCOUNT_ID: string
  RESEND_API_KEY: string
  PAYWUZ_API_KEY: string
  ADMIN_USER_ID: string
}
