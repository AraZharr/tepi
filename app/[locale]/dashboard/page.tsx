'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const PLATFORMS = [
  { value: 'github_pages', label: 'GitHub Pages' },
  { value: 'vercel', label: 'Vercel' },
  { value: 'cloudflare_pages', label: 'Cloudflare Pages' },
  { value: 'vps', label: 'VPS' },
  { value: 'other', label: 'Lainnya' },
]

const PROJECT_TYPES = [
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'blog', label: 'Blog' },
  { value: 'tools_app', label: 'Tools / App' },
  { value: 'dev_testing', label: 'Development / Testing' },
  { value: 'community', label: 'Komunitas' },
  { value: 'other', label: 'Lainnya' },
]

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: 'Menunggu Review', class: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' },
  approved: { label: 'Disetujui', class: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  rejected: { label: 'Ditolak', class: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ applications: any[]; subdomains: any[] }>({ applications: [], subdomains: [] })

  // Form state
  const [form, setForm] = useState({
    subdomain_name: '',
    target_platform: '',
    target_url: '',
    project_type: '',
    project_description: '',
    is_public: true,
    has_monetization: false,
    github_link: '',
    linkedin_link: '',
    social_link: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then((d: any) => {
      if (!d.user) { router.push('/login'); return }
      setUser(d.user)
      fetchData()
    })
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/user/subdomains')
      const d: any = await res.json()
      setData(d)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    const res = await fetch('/api/user/subdomains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result: any = await res.json()
    setFormLoading(false)

    if (!res.ok) {
      setFormError(result.error)
      return
    }

    setSubmitted(true)
    fetchData()
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">tepi.my.id</h1>
        <div className="flex items-center gap-3">
          <a href="/pricing" className="text-sm text-text-secondary hover:text-text-primary dark:text-text-secondary-dark">Harga</a>
          <a href="/dashboard/invoices" className="text-sm text-text-secondary hover:text-text-primary dark:text-text-secondary-dark">Invoice</a>
          <span className="text-sm text-text-secondary dark:text-text-secondary-dark">{user?.email}</span>
          <Button variant="secondary" onClick={handleLogout} className="px-3 py-1 text-sm">Keluar</Button>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Subdomain list */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark mb-4">Subdomain Kamu</h2>
          {data.subdomains.length === 0 ? (
            <Card hover={false} className="text-center py-8 text-text-secondary dark:text-text-secondary-dark">
              Belum punya subdomain aktif. Ajukan satu!
            </Card>
          ) : (
            <div className="grid gap-3">
              {data.subdomains.map((s) => {
                let remaining = ''
                if (s.expires_at) {
                  const exp = new Date(s.expires_at + 'Z')
                  const now = new Date()
                  const days = Math.max(0, Math.floor((exp.getTime() - now.getTime()) / 86400000))
                  remaining = days === 0 ? 'Hari ini' : `${days} hari lagi`
                }
                return (
                <Card key={s.id} hover={false} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                      {s.name}.tepi.my.id
                    </p>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                      → {s.target_value} ({s.target_type}) · {s.plan}
                    </p>
                    {remaining && <p className="text-xs text-text-muted mt-0.5">Berlaku: {remaining}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(STATUS_MAP[s.status]?.class) || ''}`}>
                      {STATUS_MAP[s.status]?.label || s.status}
                    </span>
                    {s.status === 'active' && (
                      <Button variant="secondary" className="px-3 py-1 text-xs">Perpanjang</Button>
                    )}
                  </div>
                </Card>
              )})}
            </div>
          )}
        </section>

        {/* Applications list */}
        <section className="mb-10">
          <h2 className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark mb-4">Riwayat Pengajuan</h2>
          {data.applications.length === 0 ? (
            <Card hover={false} className="text-center py-8 text-text-secondary dark:text-text-secondary-dark">
              Belum ada pengajuan.
            </Card>
          ) : (
            <div className="grid gap-3">
              {data.applications.map((a) => (
                <Card key={a.id} hover={false} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                      {a.subdomain_name}.tepi.my.id
                    </p>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                      {PLATFORMS.find(p => p.value === a.target_platform)?.label || a.target_platform}
                    </p>
                    {a.status === 'rejected' && a.reject_reason && (
                      <p className="mt-1 text-sm text-red">Alasan: {a.reject_reason}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(STATUS_MAP[a.status]?.class) || ''}`}>
                    {STATUS_MAP[a.status]?.label || a.status}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Claim form */}
        <section>
          <h2 className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark mb-4">Ajukan Subdomain Baru</h2>
          {submitted ? (
            <Card hover={false} className="text-center py-8">
              <p className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">✅ Pengajuan terkirim!</p>
              <p className="mt-2 text-text-secondary dark:text-text-secondary-dark">Tim kami akan mereview dalam 1×24 jam.</p>
              <Button className="mt-4" onClick={() => { setSubmitted(false); setForm({ subdomain_name: '', target_platform: '', target_url: '', project_type: '', project_description: '', is_public: true, has_monetization: false, github_link: '', linkedin_link: '', social_link: '' }) }}>
                Ajukan Lagi
              </Button>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Nama Subdomain</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={63}
                    pattern="^[a-z0-9-]+$"
                    value={form.subdomain_name}
                    onChange={(e) => setForm({ ...form, subdomain_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                  />
                  <span className="whitespace-nowrap text-sm text-text-muted">.tepi.my.id</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Platform Target</label>
                <select
                  required
                  value={form.target_platform}
                  onChange={(e) => setForm({ ...form, target_platform: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                >
                  <option value="">Pilih platform...</option>
                  {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">URL Target</label>
                <input
                  type="url"
                  required
                  placeholder="https://username.github.io"
                  value={form.target_url}
                  onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Tipe Project</label>
                <select
                  required
                  value={form.project_type}
                  onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                >
                  <option value="">Pilih tipe...</option>
                  {PROJECT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  Deskripsi Project <span className="text-text-muted font-normal">(min. 100 karakter)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  minLength={100}
                  value={form.project_description}
                  onChange={(e) => setForm({ ...form, project_description: e.target.value })}
                  placeholder="Jelaskan project kamu secara detail..."
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                />
                <p className="mt-1 text-xs text-text-muted">{form.project_description.length}/100 karakter</p>
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm text-text-primary dark:text-text-primary-dark">
                  <input type="checkbox" checked={form.is_public} onChange={() => setForm({ ...form, is_public: !form.is_public })} className="rounded" />
                  Project publik
                </label>
                <label className="flex items-center gap-2 text-sm text-text-primary dark:text-text-primary-dark">
                  <input type="checkbox" checked={form.has_monetization} onChange={() => setForm({ ...form, has_monetization: !form.has_monetization })} className="rounded" />
                  Ada monetisasi
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">GitHub (opsional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/username/repo"
                  value={form.github_link}
                  onChange={(e) => setForm({ ...form, github_link: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">LinkedIn (opsional)</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={form.linkedin_link}
                  onChange={(e) => setForm({ ...form, linkedin_link: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Social Lain (opsional)</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/username"
                  value={form.social_link}
                  onChange={(e) => setForm({ ...form, social_link: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
                />
              </div>

              {formError && <p className="md:col-span-2 text-sm text-red">{formError}</p>}

              <div className="md:col-span-2">
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Mengirim...' : 'Ajukan Subdomain'}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
