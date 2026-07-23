'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import SiteNav from '@/components/SiteNav'
import NotificationBell from '@/components/NotificationBell'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    mode: 'onBlur',
  })

  const onSubmit = async (data: { email: string }) => {
    setLoading(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email.trim().toLowerCase() }),
      })
      
      const json = await res.json()
      
      if (res.ok && json.success) {
        setMessage({ type: 'success', text: json.message || 'Link reset dikirim ke email kamu' })
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
            Lupa Password
          </h1>
          <p className="mt-2 text-text-secondary dark:text-text-secondary-dark">
            Masukkan email, kami kirim link reset password
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email wajib diisi',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Format email tidak valid',
                  },
                })}
                className={`w-full rounded-lg border px-4 py-2.5 text-text-primary dark:text-text-primary-dark transition ${
                  errors.email
                    ? 'border-red focus:border-red focus:ring-red/20'
                    : 'border-border bg-bg focus:border-blue focus:ring-blue/20 dark:border-border-dark dark:bg-bg-dark'
                }`}
                placeholder="kamu@email.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue py-2.5 text-white font-semibold hover:bg-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary dark:text-text-secondary-dark">
            Ingat password?{' '}
            <Link href="/login" className="text-blue hover:underline font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}