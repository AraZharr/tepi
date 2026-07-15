'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const PLATFORMS: Record<string, string> = {
  github_pages: 'GitHub Pages',
  vercel: 'Vercel',
  cloudflare_pages: 'Cloudflare Pages',
  vps: 'VPS',
  other: 'Lainnya',
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetchApplications()
    })
  }, [])

  async function fetchApplications() {
    try {
      const res = await fetch('/api/admin/applications')
      if (res.status === 403) { router.push('/dashboard'); return }
      const d = await res.json()
      setApplications(d.pending || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleApprove(id: string) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    setActionLoading(null)
    if (res.ok) fetchApplications()
  }

  async function handleReject() {
    if (!rejectModal || !rejectReason.trim()) return
    setActionLoading(rejectModal.id)
    const res = await fetch(`/api/admin/applications/${rejectModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin — Review Aplikasi</h1>
        <span className="text-sm text-text-secondary dark:text-text-secondary-dark">{user?.email}</span>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8">
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
                    <h3 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">
                      {app.subdomain_name}.tepi.my.id
                    </h3>
                    <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                      PENDING
                    </span>
                  </div>

                  <div className="mt-2 grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
                    <p className="text-text-secondary">Pemohon: <span className="text-text-primary">{app.full_name || app.email}</span></p>
                    <p className="text-text-secondary">Email: <span className="text-text-primary">{app.email}</span></p>
                    <p className="text-text-secondary">Platform: <span className="text-text-primary">{PLATFORMS[app.target_platform] || app.target_platform}</span></p>
                    <p className="text-text-secondary">Tipe: <span className="text-text-primary">{app.project_type}</span></p>
                    <p className="text-text-secondary">Target: <a href={app.target_url} target="_blank" className="text-blue hover:underline">{app.target_url}</a></p>
                    <p className="text-text-secondary">Publik: <span className="text-text-primary">{app.is_public ? 'Ya' : 'Tidak'}</span></p>
                    {app.github_link && <p className="text-text-secondary">GitHub: <a href={app.github_link} target="_blank" className="text-blue hover:underline">{app.github_link}</a></p>}
                    {app.linkedin_link && <p className="text-text-secondary">LinkedIn: <a href={app.linkedin_link} target="_blank" className="text-blue hover:underline">{app.linkedin_link}</a></p>}
                  </div>

                  <p className="mt-3 text-sm text-text-secondary border-t border-border pt-3 dark:border-border-dark">
                    {app.project_description}
                  </p>
                </div>

                <div className="flex flex-col gap-2 justify-end">
                  <Button
                    onClick={() => handleApprove(app.id)}
                    disabled={actionLoading === app.id}
                  >
                    {actionLoading === app.id ? 'Memproses...' : '✅ Setujui'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setRejectModal({ id: app.id, name: app.subdomain_name })}
                    disabled={actionLoading === app.id}
                  >
                    Tolak
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-bg p-6 shadow-lg dark:border-border-dark dark:bg-surface-dark">
            <h3 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">
              Tolak {rejectModal.name}.tepi.my.id
            </h3>
            <p className="mt-1 text-sm text-text-secondary">Alasan penolakan akan dikirim ke pemohon via email.</p>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan..."
              className="mt-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            />
            <div className="mt-4 flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setRejectModal(null)}>Batal</Button>
              <Button variant="danger" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading === rejectModal.id}>
                {actionLoading === rejectModal.id ? 'Memproses...' : 'Kirim Penolakan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
