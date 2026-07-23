'use client'

import { useState } from 'react'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
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
                  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                  : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                placeholder="kamu@email.com"
                disabled={loading}
              />
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