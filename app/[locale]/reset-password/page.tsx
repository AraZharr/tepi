'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import SiteNav from '@/components/SiteNav'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [validToken, setValidToken] = useState(true)
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    mode: 'onBlur',
  })

  const password = watch('password')

  useEffect(() => {
    if (!token || !email) {
      setValidToken(false)
      setMessage({ type: 'error', text: 'Link reset tidak valid atau tidak lengkap' })
    }
  }, [token, email])

  const onSubmit = async (data: { password: string; confirmPassword: string }) => {
    if (!token || !email) return
    
    setLoading(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password: data.password }),
      })
      
      const json = await res.json()
      
      if (res.ok && json.success) {
        setMessage({ type: 'success', text: json.message || 'Password berhasil diubah' })
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setMessage({ type: 'error', text: json.error || 'Terjadi kesalahan' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <SiteNav />
      
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-text-primary dark:text-text-primary-dark">
            Reset Password
          </h1>
          <p className="mt-2 text-text-secondary dark:text-text-secondary-dark">
            Masukkan password baru untuk {email}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 dark:border-border-dark dark:bg-surface-dark">
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green/10 text-green border border-green/20 dark:bg-green/10 dark:text-green-light dark:border-green/20'
                  : 'bg-red/10 text-red border border-red/20 dark:bg-red/10 dark:text-red-light dark:border-red/20'
              }`}
            >
              {message.text}
            </div>
          )}

          {!validToken ? (
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-blue hover:underline font-medium"
              >
                Minta link reset baru
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Password Baru
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password', {
                    required: 'Password wajib diisi',
                    minLength: { value: 8, message: 'Minimal 8 karakter' },
                  })}
                  className={`w-full rounded-lg border px-4 py-2.5 text-text-primary dark:text-text-primary-dark transition ${
                    errors.password
                      ? 'border-red focus:border-red focus:ring-red/20'
                      : 'border-border bg-bg focus:border-blue focus:ring-blue/20 dark:border-border-dark dark:bg-bg-dark'
                  }`}
                  placeholder="Minimal 8 karakter"
                  disabled={loading}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                  Konfirmasi Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword', {
                    required: 'Konfirmasi password wajib diisi',
                    validate: (value) => value === password || 'Password tidak cocok',
                  })}
                  className={`w-full rounded-lg border px-4 py-2.5 text-text-primary dark:text-text-primary-dark transition ${
                    errors.confirmPassword
                      ? 'border-red focus:border-red focus:ring-red/20'
                      : 'border-border bg-bg focus:border-blue focus:ring-blue/20 dark:border-border-dark dark:bg-bg-dark'
                  }`}
                  placeholder="Ulangi password"
                  disabled={loading}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue py-2.5 text-white font-semibold hover:bg-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Memproses...' : 'Ubah Password'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary dark:text-text-secondary-dark">
          Kembali ke{' '}
          <Link href="/login" className="text-blue hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}