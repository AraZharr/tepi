'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSubmitted(true)
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-center dark:bg-bg-dark">
        <div className="max-w-sm">
          <h1 className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            Cek email kamu
          </h1>
          <p className="mt-3 text-text-secondary dark:text-text-secondary-dark">
            Link konfirmasi sudah dikirim ke <strong>{email}</strong>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 dark:bg-bg-dark">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg p-8 shadow-md dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark">
          Daftar tepi.my.id
        </h1>

        <form onSubmit={handleRegister} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Nama lengkap
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            />
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Daftar'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border dark:bg-border-dark" />
          <span className="text-xs text-text-muted dark:text-text-muted-dark">atau</span>
          <div className="h-px flex-1 bg-border dark:bg-border-dark" />
        </div>

        <Button variant="secondary" onClick={handleGoogleLogin} className="w-full">
          Daftar dengan Google
        </Button>

        <p className="mt-6 text-center text-sm text-text-secondary dark:text-text-secondary-dark">
          Sudah punya akun?{' '}
          <a href="/login" className="text-blue hover:underline dark:text-blue-dark">
            Masuk
          </a>
        </p>
      </div>
    </main>
  )
}
