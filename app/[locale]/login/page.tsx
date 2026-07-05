'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 dark:bg-bg-dark">
      <div className="w-full max-w-sm rounded-lg border border-border bg-bg p-8 shadow-md dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark">
          Masuk ke tepi.my.id
        </h1>

        <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            />
          </div>

          {error && <p className="text-sm text-red">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border dark:bg-border-dark" />
          <span className="text-xs text-text-muted dark:text-text-muted-dark">atau</span>
          <div className="h-px flex-1 bg-border dark:bg-border-dark" />
        </div>

        <Button variant="secondary" onClick={handleGoogleLogin} className="w-full">
          Masuk dengan Google
        </Button>

        <p className="mt-6 text-center text-sm text-text-secondary dark:text-text-secondary-dark">
          Belum punya akun?{' '}
          <a href="/register" className="text-blue hover:underline dark:text-blue-dark">
            Daftar
          </a>
        </p>
      </div>
    </main>
  )
}
