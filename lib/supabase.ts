import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Client Supabase untuk dipakai di sisi client (browser).
 * Hanya punya akses sesuai Row Level Security yang dikonfigurasi.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Client Supabase dengan service role key — hanya untuk server-side.
 * JANGAN ekspos ke client/browser.
 */
export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
