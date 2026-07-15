'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import TurnstileWidget from '@/components/TurnstileWidget'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) { setError('Verifikasi CAPTCHA diperlukan'); return }
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    setLoading(false)

    if (authErr) { setError(authErr.message); return }
    router.push('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-2xl font-extrabold text-center mb-1 text-text-primary dark:text-text-primary-dark">Daftar</h1>
        <p className="text-sm text-center text-text-secondary mb-6">Buat akun untuk klaim subdomain gratis</p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Nama Lengkap</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Password</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
            <p className="mt-1 text-xs text-text-muted">Minimal 6 karakter</p>
          </div>

          <TurnstileWidget onVerify={setTurnstileToken} />

          {error && <p className="text-sm text-red">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Mendaftar...' : 'Daftar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Sudah punya akun? <Link href="/login" className="text-blue hover:underline">Masuk</Link>
        </p>
      </div>
    </main>
  )
}
