'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import TurnstileWidget from '@/components/TurnstileWidget'
import { useRouter } from 'next/navigation'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { PasswordStrength } from '@/components/PasswordStrength'
import { isDisposableEmail } from '@/lib/temp-mail'

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [otpStatus, setOtpStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmSuccess, setConfirmSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [timer])

  async function handleResendOtp() {
    setResendLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, fullName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage('Kode OTP baru telah dikirim')
      setTimer(60)
    } catch (e: any) {
      setError(e.message)
    }
    setResendLoading(false)
  }

  const passwordMatch = password && confirmPassword && password === confirmPassword

  useEffect(() => {
    if (!password || !confirmPassword) {
      setConfirmSuccess(false)
      setConfirmError(null)
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('Password dan konfirmasi password tidak cocok')
      setConfirmSuccess(false)
      return
    }
    setConfirmError(null)
    setConfirmSuccess(true)
    const t = setTimeout(() => setConfirmSuccess(false), 3000)
    return () => clearTimeout(t)
  }, [password, confirmPassword])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!turnstileToken) { setError('Verifikasi CAPTCHA diperlukan'); return }

    const finalErrors: string[] = []
    if (!email || !email.includes('@')) {
      finalErrors.push('Email tidak valid')
    }
    if (isDisposableEmail(email)) {
      finalErrors.push('Domain email tidak diperbolehkan')
    }
    if (!password) {
      finalErrors.push('Password wajib diisi')
    }
    if (!passwordMatch) {
      finalErrors.push('Password dan konfirmasi password tidak cocok')
    }
    if (!fullName.trim()) {
      finalErrors.push('Nama lengkap wajib diisi')
    }
    if (!username) {
      finalErrors.push('Username wajib diisi')
    }

    if (finalErrors.length) {
      setError(finalErrors.join('. '))
      return
    }

    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, fullName })
      })
      const data: any = await res.json()
      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }
      if (data.message) {
        setMessage(data.message)
        setStep('otp')
        setTimer(60)
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
    setOtpStatus('idle')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp, email, password })
      })
      const data: any = await res.json()
      if (!res.ok) {
        setError(data.error || 'Kode OTP salah')
        setOtpStatus('invalid')
        setLoading(false)
        return
      }
      setOtpStatus('valid')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 400)
    } catch {
      setError('Gagal verifikasi OTP')
      setOtpStatus('invalid')
    }
    setLoading(false)
  }

  const handleBack = () => {
    setStep('form')
    setMessage(null)
    setError(null)
    setConfirmError(null)
    setConfirmSuccess(false)
    setOtpStatus('idle')
    setOtp('')
    setTimer(0)
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
              <div className="relative">
                <input
                  required
                  value={otp}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(v)
                    setOtpStatus('idle')
                    setError(null)
                  }}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="123456"
                  className={`w-full rounded-md border bg-bg px-3 py-2 pr-10 text-sm text-center text-xl tracking-[.5em] focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark ${
                    otpStatus === 'valid'
                      ? 'border-green-500 focus:border-green-500'
                      : otpStatus === 'invalid'
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-border focus:border-blue'
                  }`}
                />
                {otpStatus === 'valid' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {otpStatus === 'invalid' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
            </Button>

            <div className="flex justify-between items-center">
              <button type="button" onClick={handleBack} className="text-sm text-blue hover:underline">← Ganti email</button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timer > 0 || resendLoading}
                className={`text-sm font-semibold ${timer > 0 ? 'text-text-muted cursor-not-allowed' : 'text-blue hover:underline'}`}
              >
                {timer > 0 ? `Kirim ulang OTP dalam 00:${String(timer).padStart(2,'0')}` : (resendLoading ? 'Mengirim...' : 'Kirim ulang OTP')}
              </button>
            </div>
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
              <input required value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                minLength={3} maxLength={30} placeholder="min 3, tanpa spasi"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark" />
            </div>
            <div className="grid gap-2">
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full rounded-md border bg-bg px-3 py-2 text-sm focus:outline-none dark:bg-surface-dark pr-10 ${password ? (password === confirmPassword ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-border dark:border-border-dark focus:border-blue'} dark:text-text-primary-dark`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1">
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                {(password && password === confirmPassword) && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-300" style={{ opacity: confirmSuccess ? 1 : 0 }}>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </span>
                )}
                {password && password !== confirmPassword && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                )}
              </div>
              <PasswordStrength password={password} />
            </div>
            <div className="grid gap-2">
              <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Konfirmasi Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-md border bg-bg px-3 py-2 text-sm focus:outline-none dark:bg-surface-dark pr-10 ${confirmPassword ? (passwordMatch ? 'border-green-500 focus:border-green-500' : 'border-red-500 focus:border-red-500') : 'border-border dark:border-border-dark focus:border-blue'} dark:text-text-primary-dark`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1">
                  {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                {(confirmPassword && passwordMatch) && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center transition-opacity duration-300" style={{ opacity: confirmSuccess ? 1 : 0 }}>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                )}
                {(confirmPassword && !passwordMatch) && (
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </span>
                )}
              </div>
              {(confirmError || error) && (
                <p className="text-sm text-red-600 dark:text-red-400">{confirmError || error}</p>
              )}
            </div>
            <TurnstileWidget onVerify={setTurnstileToken} />
            <Button type="submit" disabled={loading}>{loading ? 'Mendaftar...' : 'Daftar'}</Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-text-muted">
          Sudah punya akun? <Link href="/login" className="text-blue hover:underline">Masuk</Link>
        </p>
      </div>
    </main>
  )
}