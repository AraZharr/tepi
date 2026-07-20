'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function ReportAbusePage() {
  const [form, setForm] = useState({ subdomain_name: '', reporter_email: '', reason: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/abuse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data: any = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error); return }
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <Card hover={false} className="p-6">
          {sent ? (
            <div className="py-8 text-center">
              <p className="text-3xl mb-4">✅</p>
              <h2 className="font-heading text-xl font-bold mb-2">Laporan Terkirim</h2>
              <p className="text-text-secondary mb-4">Tim kami akan review laporan Anda.</p>
              <Button onClick={() => { setSent(false); setForm({ subdomain_name: '', reporter_email: '', reason: '' }) }}>
                Laporkan Lagi
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-xl font-bold mb-1">Laporkan Subdomain</h1>
              <p className="text-sm text-text-secondary mb-6">Laporkan subdomain yang mencurigakan, phishing, atau melanggar aturan.</p>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Nama Subdomain *</label>
                  <div className="flex items-center gap-2">
                    <input required value={form.subdomain_name} onChange={e => setForm({...form, subdomain_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})}
                      className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                    <span className="text-sm text-text-muted shrink-0">.tepi.my.id</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Email (opsional)</label>
                  <input type="email" value={form.reporter_email} onChange={e => setForm({...form, reporter_email: e.target.value})}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Alasan * <span className="text-text-muted font-normal">(min 20 karakter)</span></label>
                  <textarea required rows={4} minLength={20} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                  <p className="mt-1 text-xs text-text-muted">{form.reason.length}/20 karakter</p>
                </div>
                {error && <p className="text-sm text-red">{error}</p>}
                <Button type="submit" disabled={loading}>{loading ? 'Mengirim...' : '📨 Kirim Laporan'}</Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}
