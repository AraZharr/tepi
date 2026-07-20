'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import TurnstileWidget from '@/components/TurnstileWidget'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) { setError('Verifikasi CAPTCHA diperlukan'); return }
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, fullName }),
      })
      const data: any = await res.json()

      if (!res.ok) { setError(data.error); setLoading(false); return }

      if (data.message) {
        setMessage(data.message)
        setStep('otp')
      } else if (data.token) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Gagal menghubungi server')
    }
    setLoading(false)
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp, email, password }),
      })
      const data: any = await res.json()

      if (!res.ok) { setError(data.error); setLoading(false); return }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Gagal verifikasi OTP')
    }
    setLoading(false)
  }

  function handleBack() {
    setStep('form')
    setMessage(null)
    setError(null)
    setOtp('')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-2xl font-extrabold text-center mb-1 text-text-primary dark:text-text-primary-dark">Daftar</h1>
        <p className="text-sm text-center text-text-secondary mb-6">Buat akun untuk klaim subdomain gratis</p>

        {step === 'otp' ? (
          <form onSubmit={handleOtpVerify} className="grid gap-4">
            <p className="text-sm text-text-secondary text-center">{message}</p>
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Kode OTP</label>
              <input
                required
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                placeholder="123456"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-center text-xl tracking-[.5em] focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
              />
            </div>

            {error && <p className="text-sm text-red">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
            </Button>

            <button type="button" onClick={handleBack}
              className="text-sm text-blue hover:underline text-center">← Ganti email</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Nama Lengkap</label>
              <input required value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Username</label>
              <input
                required
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                minLength={3}
                maxLength={30}
                placeholder="min 3, tanpa spasi"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
              />
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
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          Sudah punya akun? <Link href="/login" className="text-blue hover:underline">Masuk</Link>
        </p>
      </div>
    </main>
  )
}
