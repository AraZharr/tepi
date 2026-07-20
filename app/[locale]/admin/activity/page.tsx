'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function AdminActivityPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then((data: any) => {
      const user = data?.user
      if (!user) { router.push('/login'); return }
      fetchLogs()
    })
  }, [])

  async function fetchLogs() {
    const res = await fetch('/api/admin/activity')
    if (res.status === 403) { router.push('/dashboard'); return }
    const d: any = await res.json()
    setLogs(d.logs || [])
    setLoading(false)
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin — Activity Logs</h1>
        <Button onClick={() => router.push('/admin')}>← Kembali</Button>
      </nav>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-text-muted"><th className="pb-2 pr-4">Action</th><th className="pb-2 pr-4">Type</th><th className="pb-2 pr-4">User</th><th className="pb-2">Time</th></tr></thead>
            <tbody>{logs.map((l: any, i: number) => <tr key={i} className="border-b border-border/50"><td className="py-2 pr-4">{l.action}</td><td className="py-2 pr-4"><code className="rounded bg-surface px-1.5 py-0.5 text-xs dark:bg-surface-dark">{l.type}</code></td><td className="py-2 pr-4 text-text-muted font-mono text-xs">{l.user_id?.slice(0, 12)}...</td><td className="py-2 text-text-muted text-xs">{l.created_at}</td></tr>)}</tbody>
          </table>
        </div>
        {logs.length === 0 && <p className="mt-8 text-center text-text-muted">No activity logs yet</p>}
      </div>
    </main>
  )
}
