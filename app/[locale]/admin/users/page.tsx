'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function AdminUsersPage() {
  const router = useRouter()
  const [data, setData] = useState<any>({ users: [], subdomains: [], applications: [], payments: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('users')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'user', subdomain_limit: 0 })

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then((d: any) => {
      if (!d?.user) { router.push('/login'); return }
      fetchData()
    })
  }, [])

  async function fetchData() {
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { router.push('/dashboard'); return }
    setData(await res.json())
    setLoading(false)
  }

  const startEdit = (user: any) => {
    setEditingId(user.id)
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || 'user',
      subdomain_limit: user.subdomain_limit ?? 0
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ full_name: '', role: 'user', subdomain_limit: 0 })
  }

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/admin/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm })
    })
    if (res.ok) {
      setData((d: any) => ({
        ...d,
        users: d.users.map((u: any) => u.id === id ? { ...u, ...editForm } : u)
      }))
      cancelEdit()
    } else alert('Update gagal')
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Hapus user ini?')) return
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setData((d: any) => ({
        ...d,
        users: d.users.filter((u: any) => u.id !== id)
      }))
    } else alert('Hapus gagal')
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
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 dark:bg-surface-2-dark">
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="p-3">Email</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Limit</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users?.map((u: any) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      {editingId === u.id ? <input className="w-full rounded border p-1" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /> : (u.full_name || '-')}
                    </td>
                    <td className="p-3">
                      {editingId === u.id ? (
                        <select className="rounded border p-1" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{u.role}</span>}
                    </td>
                    <td className="p-3">
                      {editingId === u.id ? <input type="number" className="w-16 rounded border p-1" value={editForm.subdomain_limit} onChange={e => setEditForm(f => ({ ...f, subdomain_limit: +e.target.value }))} /> : (u.subdomain_limit ?? 0)}
                    </td>
                    <td className="p-3">
                      {editingId === u.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => saveEdit(u.id)}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => startEdit(u)}>Edit</Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>Hapus</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  )
}
