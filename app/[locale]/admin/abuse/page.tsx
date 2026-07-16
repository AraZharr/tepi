'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function AdminAbusePage() {
  const router = useRouter()
  const [data, setData] = useState<any>({ pending: [], all: [] })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(({ user }) => {
      if (!user) { router.push('/login'); return }
      fetchData()
    })
  }, [])

  async function fetchData() {
    const res = await fetch('/api/admin/abuse')
    if (res.status === 403) { router.push('/dashboard'); return }
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    setActionLoading(id)
    await fetch('/api/admin/abuse', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setActionLoading(null)
    fetchData()
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  const pending = data.pending || []
  const all = data.all || []

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin — Abuse Reports</h1>
        <Button onClick={() => router.push('/admin')}>← Kembali</Button>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="font-heading text-xl font-bold mb-4">Pending Review ({pending.length})</h2>

        {pending.length === 0 ? (
          <Card hover={false} className="text-center py-8 text-text-muted">✅ Tidak ada laporan pending</Card>
        ) : (
          <div className="grid gap-4 mb-10">
            {pending.map((r: any) => (
              <Card key={r.id} hover={false} className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-text-primary">{r.subdomain_name}.tepi.my.id</p>
                  <p className="text-sm text-text-secondary mt-1">{r.reason}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {r.reporter_email || 'Anonymous'} · {r.created_at}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" onClick={() => updateStatus(r.id, 'reviewed')} disabled={actionLoading === r.id}>
                    Selesai Review
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <h2 className="font-heading text-xl font-bold mb-4">Semua Laporan ({all.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-text-muted"><th className="pb-2 pr-4">Subdomain</th><th className="pb-2 pr-4">Alasan</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Tanggal</th></tr></thead>
            <tbody>{all.map((r: any) => <tr key={r.id} className="border-b border-border/50">
              <td className="py-2 pr-4 font-medium">{r.subdomain_name}</td>
              <td className="py-2 pr-4 text-xs max-w-xs truncate">{r.reason}</td>
              <td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>{r.status}</span></td>
              <td className="py-2 text-xs text-text-muted">{r.created_at}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
