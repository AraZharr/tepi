'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import TurnstileWidget from '@/components/TurnstileWidget'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
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
        body: JSON.stringify({ email: identifier, password, identifier }),
      })
      const data: any = await res.json()

      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      // User found and password matches — direct login
      if (data.token) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      // Need OTP (register flow for new users, or OTP for login)
      if (data.message) {
        setMessage(data.message)
      } else {
        setMessage('Kode OTP dikirim ke email kamu')
      }

      // Send OTP separately for login
      if (!data.token) {
        await fetch('/api/auth/otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier }),
        })
        setMessage('Kode OTP dikirim ke email kamu')
      }

      setStep('otp')
      setLoading(false)
    } catch {
      setError('Gagal menghubungi server')
      setLoading(false)
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp, identifier, password }),
      })
      const data: any = await res.json()

      if (!res.ok) { setError(data.error); setLoading(false); return }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Gagal verifikasi OTP')
      setLoading(false)
    }
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
        <h1 className="font-heading text-2xl font-extrabold text-center mb-1 text-text-primary dark:text-text-primary-dark">Masuk</h1>
        <p className="text-sm text-center text-text-secondary mb-6">Login ke dashboard tepi.my.id</p>

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
              className="text-sm text-blue hover:underline text-center">← Ganti email/username</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Email atau Username</label>
              <input required value={identifier} onChange={e => setIdentifier(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
            </div>

            <TurnstileWidget onVerify={setTurnstileToken} />

            {error && <p className="text-sm text-red">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          Belum punya akun? <Link href="/register" className="text-blue hover:underline">Daftar</Link>
        </p>
      </div>
    </main>
  )
}
