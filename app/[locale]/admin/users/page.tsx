'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function AdminUsersPage() {
  const router = useRouter()
  const [data, setData] = useState<any>({ users: [], subdomains: [], applications: [], payments: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('users')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetchData()
    })
  }, [])

  async function fetchData() {
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { router.push('/dashboard'); return }
    setData(await res.json())
    setLoading(false)
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  const tabs = ['users', 'subdomains', 'applications']

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin — Manajemen</h1>
        <Button onClick={() => router.push('/admin')}>← Kembali</Button>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex gap-2 border-b border-border pb-2 dark:border-border-dark">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold rounded-t-md transition ${tab === t ? 'bg-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)} ({data[t]?.length || 0})
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-text-muted"><th className="pb-2 pr-4">Email</th><th className="pb-2 pr-4">Name</th><th className="pb-2">Joined</th></tr></thead>
              <tbody>{data.users?.map((u: any) => <tr key={u.id} className="border-b border-border/50"><td className="py-2 pr-4">{u.email}</td><td className="py-2 pr-4">{u.full_name || '-'}</td><td className="py-2 text-text-muted">{u.created_at}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {tab === 'subdomains' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-text-muted"><th className="pb-2 pr-4">Name</th><th className="pb-2 pr-4">Plan</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Expires</th></tr></thead>
              <tbody>{data.subdomains?.map((s: any) => <tr key={s.id} className="border-b border-border/50"><td className="py-2 pr-4 font-medium">{s.name}.tepi.my.id</td><td className="py-2 pr-4">{s.plan}</td><td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{s.status}</span></td><td className="py-2 text-text-muted">{s.expires_at || '-'}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {tab === 'applications' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-text-muted"><th className="pb-2 pr-4">Subdomain</th><th className="pb-2 pr-4">User</th><th className="pb-2 pr-4">Status</th><th className="pb-2">Date</th></tr></thead>
              <tbody>{data.applications?.map((a: any) => <tr key={a.id} className="border-b border-border/50"><td className="py-2 pr-4 font-medium">{a.subdomain_name}</td><td className="py-2 pr-4">{a.user_id?.slice(0, 8)}...</td><td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === 'approved' ? 'bg-green-50 text-green-700' : a.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>{a.status}</span></td><td className="py-2 text-text-muted">{a.created_at}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
