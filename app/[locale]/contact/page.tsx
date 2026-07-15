'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '6281234567890'
const EMAIL_ADDR = process.env.NEXT_PUBLIC_EMAIL_ADDR || 'hello@tepi.my.id'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error); return }
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="border-b border-border bg-surface px-6 py-4 dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-heading text-xl font-extrabold text-text-primary dark:text-text-primary-dark">tepi.my.id</Link>
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">← Beranda</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-heading text-3xl font-extrabold text-text-primary dark:text-text-primary-dark mb-2">Hubungi Kami</h1>
        <p className="text-text-secondary dark:text-text-secondary-dark mb-8">Ada pertanyaan, saran, atau butuh bantuan? Kami siap membantu.</p>

        <div className="grid gap-8 md:grid-cols-[1fr_320px]">
          {/* Form */}
          <Card hover={false} className="p-6">
            {sent ? (
              <div className="py-8 text-center">
                <p className="text-2xl mb-4">✅</p>
                <p className="font-heading text-xl font-bold text-text-primary mb-2">Pesan Terkirim!</p>
                <p className="text-text-secondary">Kami akan membalas dalam 1×24 jam.</p>
                <Button className="mt-4" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }) }}>
                  Kirim Lagi
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Nama</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Email</label>
                    <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Subjek</label>
                  <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Pesan</label>
                  <textarea required rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                </div>
                {error && <p className="text-sm text-red">{error}</p>}
                <Button type="submit" disabled={loading}>{loading ? 'Mengirim...' : '📨 Kirim Pesan'}</Button>
              </form>
            )}
          </Card>

          {/* Sidebar */}
          <div className="grid gap-4">
            <Card hover={false} className="p-5">
              <h3 className="font-heading font-bold text-text-primary mb-2">WhatsApp</h3>
              <p className="text-sm text-text-secondary mb-3">Respon lebih cepat via chat</p>
              <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition">Chat WhatsApp →</a>
            </Card>

            <Card hover={false} className="p-5">
              <h3 className="font-heading font-bold text-text-primary mb-2">Email</h3>
              <p className="text-sm text-text-secondary mb-3">Butuh dokumentasi tertulis</p>
              <a href={`mailto:${EMAIL_ADDR}?subject=Halo%20tepi.my.id`} className="text-blue hover:underline text-sm">{EMAIL_ADDR}</a>
            </Card>

            <Card hover={false} className="p-5">
              <h3 className="font-heading font-bold text-text-primary mb-2">Jam Operasional</h3>
              <p className="text-sm text-text-secondary">Senin—Jumat, 09:00—18:00 WIB</p>
              <p className="text-sm text-text-muted mt-1">Akhir pekan respon mungkin lebih lambat</p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
