'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import SiteNav from '@/components/SiteNav'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [validToken, setValidToken] = useState(true)
  
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!token || !email) {
      setValidToken(false)
      setMessage({ type: 'error', text: 'Link reset tidak valid atau tidak lengkap' })
    }
  }, [token, email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !email) return
    
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password minimal 8 karakter' })
      return
    }
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Password tidak cocok' })
      return
    }
    
    setLoading(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
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
                  ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                  : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                  Password Baru
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                  placeholder="Minimal 8 karakter"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                  Konfirmasi Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                  placeholder="Ulangi password"
                  disabled={loading}
                />
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