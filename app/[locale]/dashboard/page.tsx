'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { csrfFetch } from '@/lib/csrf-client'
import NotificationBell from '@/components/NotificationBell'
import TurnstileWidget from '@/components/TurnstileWidget'

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
  active: { label: 'Aktif', class: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
}

const inputCls =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ applications: any[]; subdomains: any[] }>({ applications: [], subdomains: [] })

  const [form, setForm] = useState({
    subdomain_name: '',
    dns_records: [{ type: '', value: '' }], // Array of DNS records
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
  const [turnstileToken, setTurnstileToken] = useState('')
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

    // Validate DNS records client-side
    const validRecords = form.dns_records.filter(r => r.type && r.value.trim())
    if (validRecords.length === 0) {
      setFormError('Minimal 1 DNS record harus diisi')
      return
    }

    setFormLoading(true)

    try {
      const res = await csrfFetch('/api/user/subdomains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dns_records: validRecords, turnstile_token: turnstileToken }),
      })
      
      let result: any
      const text = await res.text()
      try {
        result = text ? JSON.parse(text) : {}
      } catch {
        console.error('[Submit] Invalid JSON response:', text)
        setFormError('Server error: Invalid response format')
        setFormLoading(false)
        return
      }

      setFormLoading(false)

      if (!res.ok) {
        setFormError(result.error || 'Gagal submit aplikasi')
        return
      }

      setSubmitted(true)
      fetchData()
    } catch (err: any) {
      console.error('[Submit] Network error:', err)
      setFormError('Network error: ' + err.message)
      setFormLoading(false)
    }
  }

  async function handleLogout() {
    await csrfFetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark">
        <p className="text-text-muted">Memuat...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      {/* Nav — stack on mobile so nothing clips */}
      <nav className="border-b border-border bg-surface dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <h1 className="font-heading shrink-0 text-base font-bold text-text-primary dark:text-text-primary-dark sm:text-lg">
            tepi.my.id
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <a href="/domains" className="text-xs text-text-secondary hover:text-text-primary sm:text-sm dark:text-text-secondary-dark">
              Domain
            </a>
            <a href="/pricing" className="text-xs text-text-secondary hover:text-text-primary sm:text-sm dark:text-text-secondary-dark">
              Harga
            </a>
            <a href="/dashboard/invoices" className="text-xs text-text-secondary hover:text-text-primary sm:text-sm dark:text-text-secondary-dark">
              Invoice
            </a>
            {user?.role === 'admin' || user?.id === process.env.NEXT_PUBLIC_ADMIN_HINT ? (
              <a href="/admin" className="text-xs font-semibold text-blue sm:text-sm">Admin</a>
            ) : null}
            <NotificationBell />
            <span className="hidden max-w-[140px] truncate text-xs text-text-secondary sm:inline sm:text-sm dark:text-text-secondary-dark">
              {user?.email}
            </span>
            <Button variant="secondary" onClick={handleLogout} className="!px-2.5 !py-1 text-xs sm:!px-3 sm:text-sm">
              Keluar
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Subdomain list */}
        <section className="mb-8 sm:mb-10">
          <h2 className="font-heading mb-4 text-lg font-bold text-text-primary dark:text-text-primary-dark sm:text-xl">
            Subdomain Kamu
          </h2>
          {data.subdomains.length === 0 ? (
            <Card hover={false} className="py-8 text-center text-text-secondary dark:text-text-secondary-dark">
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
                  <Card key={s.id} hover={false} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-semibold text-text-primary dark:text-text-primary-dark">
                        {s.name}.tepi.my.id
                      </p>
                      <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                        → {s.target_value} ({s.target_type}) · {s.plan}
                      </p>
                      {remaining && <p className="mt-0.5 text-xs text-text-muted">Berlaku: {remaining}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(STATUS_MAP[s.status]?.class) || ''}`}>
                        {STATUS_MAP[s.status]?.label || s.status}
                      </span>
                      {s.status === 'active' && (
                        <Button variant="secondary" className="!px-3 !py-1 text-xs">Perpanjang</Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* Applications list */}
        <section className="mb-8 sm:mb-10">
          <h2 className="font-heading mb-4 text-lg font-bold text-text-primary dark:text-text-primary-dark sm:text-xl">
            Riwayat Pengajuan
          </h2>
          {data.applications.length === 0 ? (
            <Card hover={false} className="py-8 text-center text-text-secondary dark:text-text-secondary-dark">
              Belum ada pengajuan.
            </Card>
          ) : (
            <div className="grid gap-3">
              {data.applications.map((a) => (
                <Card key={a.id} hover={false} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-text-primary dark:text-text-primary-dark">
                      {a.subdomain_name}.tepi.my.id
                    </p>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                      {a.dns_records ? JSON.parse(a.dns_records).map((r: any) => `${r.type} → ${r.value}`).join(', ') : `${a.record_type} → ${a.record_value}`}
                    </p>
                    {a.status === 'rejected' && a.reject_reason && (
                      <p className="mt-1 text-sm text-red">Alasan: {a.reject_reason}</p>
                    )}
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${(STATUS_MAP[a.status]?.class) || ''}`}>
                    {STATUS_MAP[a.status]?.label || a.status}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Claim form */}
        <section>
          <h2 className="font-heading mb-4 text-lg font-bold text-text-primary dark:text-text-primary-dark sm:text-xl">
            Ajukan Subdomain Baru
          </h2>
          {submitted ? (
            <Card hover={false} className="py-8 text-center">
              <p className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">✅ Pengajuan terkirim!</p>
              <p className="mt-2 text-text-secondary dark:text-text-secondary-dark">Tim kami akan mereview dalam 1×24 jam.</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setSubmitted(false)
                  setForm({
                    subdomain_name: '', dns_records: [{ type: '', value: '' }], project_type: '',
                    project_description: '', is_public: true, has_monetization: false,
                    github_link: '', linkedin_link: '', social_link: '',
                  })
                }}
              >
                Ajukan Lagi
              </Button>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  Nama Subdomain
                </label>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={63}
                    pattern="^[a-z0-9-]+$"
                    value={form.subdomain_name}
                    onChange={(e) => setForm({ ...form, subdomain_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className={inputCls}
                  />
                  <span className="shrink-0 text-sm text-text-muted">.tepi.my.id</span>
                </div>
              </div>

              {/* DNS Records - Multiple */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  DNS Records <span className="text-text-muted font-normal">(CNAME, A, TXT)</span>
                </label>
                {form.dns_records.map((record, idx) => (
                  <div key={idx} className="mb-3 grid gap-2 rounded-md border border-border p-3 dark:border-border-dark sm:grid-cols-[1fr_2fr_auto]">
                    <select
                      required
                      value={record.type}
                      onChange={(e) => {
                        const updated = [...form.dns_records]
                        updated[idx].type = e.target.value
                        setForm({ ...form, dns_records: updated })
                      }}
                      className={inputCls}
                    >
                      <option value="">Tipe...</option>
                      <option value="CNAME">CNAME</option>
                      <option value="A">A Record</option>
                      <option value="TXT">TXT</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder={
                        record.type === 'CNAME' ? 'contoh.vercel.app' :
                        record.type === 'A' ? '185.199.108.153' :
                        'Value...'
                      }
                      value={record.value}
                      onChange={(e) => {
                        const updated = [...form.dns_records]
                        updated[idx].value = e.target.value
                        setForm({ ...form, dns_records: updated })
                      }}
                      className={inputCls}
                    />
                    <div className="flex gap-2">
                      {form.dns_records.length > 1 && (
                        <Button
                          type="button"
                          variant="danger"
                          className="!px-2 !py-1.5 text-xs"
                          onClick={() => {
                            const updated = form.dns_records.filter((_, i) => i !== idx)
                            setForm({ ...form, dns_records: updated })
                          }}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {form.dns_records.length < 4 && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => {
                      setForm({ ...form, dns_records: [...form.dns_records, { type: '', value: '' }] })
                    }}
                  >
                    + Tambah Record
                  </Button>
                )}
                <p className="mt-1 text-xs text-text-muted">
                  Contoh: CNAME untuk domain utama + TXT untuk verifikasi Vercel
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Tipe Project</label>
                <select
                  required
                  value={form.project_type}
                  onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Pilih tipe...</option>
                  {PROJECT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                  Deskripsi Project <span className="font-normal text-text-muted">(min. 20 karakter)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  minLength={20}
                  value={form.project_description}
                  onChange={(e) => setForm({ ...form, project_description: e.target.value })}
                  placeholder="Jelaskan project kamu secara detail..."
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-text-muted">{form.project_description.length}/20 karakter</p>
              </div>

              <div className="flex flex-wrap gap-4 sm:col-span-2 sm:gap-6">
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
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">LinkedIn (opsional)</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={form.linkedin_link}
                  onChange={(e) => setForm({ ...form, linkedin_link: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-text-primary dark:text-text-primary-dark">Social Lain (opsional)</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/username"
                  value={form.social_link}
                  onChange={(e) => setForm({ ...form, social_link: e.target.value })}
                  className={inputCls}
                />
              </div>

              <TurnstileWidget onVerify={setTurnstileToken} />
              {formError && <p className="text-sm text-red sm:col-span-2">{formError}</p>}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={formLoading} className="w-full sm:w-auto">
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
