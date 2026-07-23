'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const PLATFORMS: Record<string, string> = {
  github_pages: 'GitHub Pages',
  vercel: 'Vercel',
  cloudflare_pages: 'Cloudflare Pages',
  vps: 'VPS',
  other: 'Lainnya',
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending: { label: 'Menunggu Review', class: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' },
  approved: { label: 'Disetujui', class: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  rejected: { label: 'Ditolak', class: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
  active: { label: 'Aktif', class: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
  suspended: { label: 'Ditangguhkan', class: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300' },
}

import { safeJsonParse } from '@/lib/safe-json'

export default function DomainsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subdomains, setSubdomains] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then((data: any) => {
      if (!data?.user) { router.push('/login'); return }
      setUser(data.user)
      fetchData()
    })
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/user/subdomains')
      if (!res.ok) { router.push('/login'); return }
      const d: any = await res.json()
      setSubdomains(d.subdomains || [])
      setApplications(d.applications || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
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
      {/* Nav */}
      <nav className="border-b border-border bg-surface dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <h1 className="font-heading shrink-0 text-base font-bold text-text-primary dark:text-text-primary-dark sm:text-lg">
            tepi.my.id
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <a href="/dashboard" className="text-xs text-text-secondary hover:text-text-primary sm:text-sm dark:text-text-secondary-dark">
              Dashboard
            </a>
            <a href="/domains" className="text-xs font-semibold text-blue sm:text-sm">
              Domain Saya
            </a>
            <a href="/pricing" className="text-xs text-text-secondary hover:text-text-primary sm:text-sm dark:text-text-secondary-dark">
              Harga
            </a>
            {user?.role === 'admin' && (
              <a href="/admin" className="text-xs font-semibold text-blue sm:text-sm">Admin</a>
            )}
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
        {/* Active subdomains */}
        <section className="mb-8 sm:mb-10">
          <h2 className="font-heading mb-4 text-lg font-bold text-text-primary dark:text-text-primary-dark sm:text-xl">
            Subdomain Aktif ({subdomains.length})
          </h2>
          {subdomains.length === 0 ? (
            <Card hover={false} className="py-8 text-center text-text-secondary dark:text-text-secondary-dark">
              Belum ada subdomain aktif.
            </Card>
          ) : (
            <div className="grid gap-3">
              {subdomains.map((s) => {
                let remaining = ''
                if (s.expires_at) {
                  const exp = new Date(s.expires_at + 'Z')
                  const now = new Date()
                  const days = Math.max(0, Math.floor((exp.getTime() - now.getTime()) / 86400000))
                  remaining = days === 0 ? 'Hari ini' : `${days} hari lagi`
                }
                return (
                  <Card key={s.id} hover={false} className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_MAP[s.status]?.class || ''}`}>
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

        {/* Pending applications */}
        <section className="mb-8 sm:mb-10">
          <h2 className="font-heading mb-4 text-lg font-bold text-text-primary dark:text-text-primary-dark sm:text-xl">
            Menunggu Review ({applications.filter((a: any) => a.status === 'pending').length})
          </h2>
          {applications.filter((a: any) => a.status === 'pending').length === 0 ? (
            <Card hover={false} className="py-8 text-center text-text-secondary dark:text-text-secondary-dark">
              Tidak ada pengajuan yang menunggu review.
            </Card>
          ) : (
            <div className="grid gap-3">
              {applications.filter((a: any) => a.status === 'pending').map((a) => (
                <Card key={a.id} hover={false} className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <p className="break-all font-semibold text-text-primary dark:text-text-primary-dark">
                      {a.subdomain_name}.tepi.my.id
                    </p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_MAP[a.status]?.class || ''}`}>
                      {STATUS_MAP[a.status]?.label || a.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                    Records: {a.dns_records ? (safeJsonParse(a.dns_records) || []).map((r: any) => `${r.type} → ${r.value}`).join(', ') : `${a.record_type} → ${a.record_value}`}
                  </p>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                    {a.project_description}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Rejected applications */}
        <section>
          <h2 className="font-heading mb-4 text-lg font-bold text-text-primary dark:text-text-primary-dark sm:text-xl">
            Ditolak ({applications.filter((a: any) => a.status === 'rejected').length})
          </h2>
          {applications.filter((a: any) => a.status === 'rejected').length === 0 ? (
            <Card hover={false} className="py-8 text-center text-text-secondary dark:text-text-secondary-dark">
              Tidak ada pengajuan yang ditolak.
            </Card>
          ) : (
            <div className="grid gap-3">
              {applications.filter((a: any) => a.status === 'rejected').map((a) => (
                <Card key={a.id} hover={false} className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <p className="break-all font-semibold text-text-primary dark:text-text-primary-dark">
                      {a.subdomain_name}.tepi.my.id
                    </p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_MAP[a.status]?.class || ''}`}>
                      {STATUS_MAP[a.status]?.label || a.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                    Records: {a.dns_records ? (safeJsonParse(a.dns_records) || []).map((r: any) => `${r.type} → ${r.value}`).join(', ') : `${a.record_type} → ${a.record_value}`}
                  </p>
                  {a.reject_reason && (
                    <p className="mt-1 rounded bg-red-50 p-2 text-sm text-red dark:bg-red-900/20">
                      <strong>Alasan:</strong> {a.reject_reason}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
