'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [data, setData] = useState<any>({ payments: [], stats: {} })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetchData()
    })
  }, [])

  async function fetchData() {
    const res = await fetch('/api/admin/payments')
    if (res.status === 403) { router.push('/dashboard'); return }
    setData(await res.json())
    setLoading(false)
  }

  const s = data.stats as any
  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin — Payments</h1>
        <Button onClick={() => router.push('/admin')}>← Kembali</Button>
      </nav>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card hover={false} className="p-4 text-center"><p className="text-2xl font-bold">{s?.total || 0}</p><p className="text-xs text-text-muted">Total</p></Card>
          <Card hover={false} className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{s?.success || 0}</p><p className="text-xs text-text-muted">Success</p></Card>
          <Card hover={false} className="p-4 text-center"><p className="text-2xl font-bold text-blue">Rp {(s?.revenue || 0).toLocaleString()}</p><p className="text-xs text-text-muted">Revenue</p></Card>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-text-muted"><th className="pb-2 pr-4">ID</th><th className="pb-2 pr-4">Amount</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Date</th></tr></thead>
            <tbody>{data.payments?.map((p: any) => <tr key={p.id} className="border-b border-border/50"><td className="py-2 pr-4 font-mono text-xs">{p.id?.slice(0, 16)}...</td><td className="py-2 pr-4">Rp {p.amount?.toLocaleString()}</td><td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === 'success' ? 'bg-green-50 text-green-700' : p.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>{p.status}</span></td><td className="py-2 text-text-muted">{p.created_at}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
