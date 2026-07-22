'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { csrfFetch } from '@/lib/csrf-client'
import NotificationBell from '@/components/NotificationBell'

const PLATFORMS: Record<string, string> = {
  github_pages: 'GitHub Pages', vercel: 'Vercel', cloudflare_pages: 'Cloudflare Pages', vps: 'VPS', other: 'Lainnya',
}

const ADMIN_SECTIONS = [
  { href: '/admin/blog', label: 'Blog', desc: 'Kelola artikel & testimoni', icon: '📝', color: 'border-l-blue' },
  { href: '/admin/users', label: 'Manajemen', desc: 'User, subdomain & aplikasi', icon: '👥', color: 'border-l-green' },
  { href: '/admin/activity', label: 'Activity', desc: 'Log aktivitas sistem', icon: '📊', color: 'border-l-yellow' },
  { href: '/admin/payments', label: 'Payments', desc: 'Histori transaksi & revenue', icon: '💰', color: 'border-l-purple' },
  { href: '/admin/settings', label: 'Settings', desc: 'Konfigurasi situs & kontak', icon: '⚙️', color: 'border-l-gray' },
]

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then((data: any) => {
      const user = data?.user
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetchApplications()
    })
  }, [])

  async function fetchApplications() {
    try {
      const res = await fetch('/api/admin/applications')
      if (res.status === 403) { router.push('/dashboard'); return }
      const d: any = await res.json()
      setApplications(d.pending || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleApprove(id: string) {
    setActionLoading(id)
    const res = await csrfFetch(`/api/admin/applications/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[Admin Approve Failed]', { status: res.status, data })
    }
    setActionLoading(null)
    if (res.ok) fetchApplications()
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return
    setActionLoading(rejectModal.id)
    const res = await csrfFetch(`/api/admin/applications/${rejectModal.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', reject_reason: rejectReason.trim() }),
    })
    setActionLoading(null)
    setRejectModal(null)
    setRejectReason('')
    if (res.ok) fetchApplications()
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      {/* Mobile nav */}
      <nav className="md:hidden flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <span className="text-sm text-text-secondary">{user?.email}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Quick sections */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {ADMIN_SECTIONS.map((s) => (
            <a key={s.href} href={s.href}
              className={`rounded-lg border border-border bg-surface p-4 transition hover:shadow-md hover:-translate-y-0.5 dark:border-border-dark dark:bg-surface-dark ${s.color}`}>
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">{s.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{s.desc}</p>
            </a>
          ))}
        </div>

        {/* Review section */}
        <h2 className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark mb-4">
          Menunggu Review <span className="text-text-muted">({applications.length})</span>
        </h2>

        {applications.length === 0 ? (
          <Card hover={false} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
            ✅ Tidak ada aplikasi yang menunggu review
          </Card>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => (
              <Card key={app.id} hover={false} className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading text-lg font-bold">{app.subdomain_name}.tepi.my.id</h3>
                    <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">PENDING</span>
                  </div>
                  <div className="mt-2 grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
                    <p className="text-text-secondary">Pemohon: <span className="text-text-primary">{app.full_name || app.email}</span></p>
                    <p className="text-text-secondary">Records: <span className="text-text-primary">
                      {app.dns_records ? JSON.parse(app.dns_records).map((r: any) => `${r.type} → ${r.value}`).join(', ') : `${app.record_type} → ${app.record_value}`}
                    </span></p>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary border-t border-border pt-3">{app.project_description}</p>
                </div>
                <div className="flex flex-col gap-2 justify-end">
                  <Button onClick={() => handleApprove(app.id)} disabled={actionLoading === app.id}>
                    {actionLoading === app.id ? '...' : '✅ Setujui'}
                  </Button>
                  <Button variant="danger" onClick={() => setRejectModal({ id: app.id, name: app.subdomain_name })} disabled={actionLoading === app.id}>
                    Tolak
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-bg p-6 shadow-lg dark:border-border-dark dark:bg-surface-dark">
            <h3 className="font-heading text-lg font-bold">Tolak {rejectModal.name}.tepi.my.id</h3>
            <p className="mt-1 text-sm text-text-secondary">Alasan penolakan akan dikirim ke pemohon via email.</p>
            <textarea required rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              className="mt-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
            <div className="mt-4 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setRejectModal(null)}>Batal</Button>
              <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading === rejectModal.id}>
                Kirim Penolakan
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
