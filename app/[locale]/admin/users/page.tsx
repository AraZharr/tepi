'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { csrfFetch } from '@/lib/csrf-client'

const inputCls =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'

export default function AdminUsersPage() {
  const router = useRouter()
  const [data, setData] = useState<any>({ users: [], subdomains: [], applications: [], payments: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('users')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'user', subdomain_limit: 0 })
  const [busy, setBusy] = useState(false)

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
      subdomain_limit: user.subdomain_limit ?? 0,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ full_name: '', role: 'user', subdomain_limit: 0 })
  }

  const saveEdit = async (id: string) => {
    setBusy(true)
    const res = await csrfFetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    })
    setBusy(false)
    if (res.ok) {
      setData((d: any) => ({
        ...d,
        users: d.users.map((u: any) => (u.id === id ? { ...u, ...editForm } : u)),
      }))
      cancelEdit()
    } else alert('Update gagal')
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Hapus user ini?')) return
    setBusy(true)
    const res = await csrfFetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      setData((d: any) => ({
        ...d,
        users: d.users.filter((u: any) => u.id !== id),
      }))
    } else alert('Hapus gagal')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark">
        <p className="text-text-muted">Memuat...</p>
      </main>
    )
  }

  const tabs = [
    { id: 'users', label: 'Users' },
    { id: 'subdomains', label: 'Subdomains' },
    { id: 'applications', label: 'Applications' },
  ]

  const RoleBadge = ({ role }: { role: string }) => (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        role === 'admin'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      }`}
    >
      {role || 'user'}
    </span>
  )

  const EditFields = () => (
    <div className="grid gap-2 sm:grid-cols-3">
      <input
        className={inputCls}
        placeholder="Nama"
        value={editForm.full_name}
        onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
      />
      <select
        className={inputCls}
        value={editForm.role}
        onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
      >
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>
      <input
        type="number"
        min={0}
        className={inputCls}
        placeholder="Limit"
        value={editForm.subdomain_limit}
        onChange={e => setEditForm(f => ({ ...f, subdomain_limit: +e.target.value }))}
      />
    </div>
  )

  const ActionRow = ({ id }: { id: string }) =>
    editingId === id ? (
      <div className="flex flex-wrap gap-2">
        <Button className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={() => saveEdit(id)}>
          Save
        </Button>
        <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={cancelEdit}>
          Cancel
        </Button>
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        <Button className="!px-3 !py-1.5 text-xs" onClick={() => startEdit(data.users.find((x: any) => x.id === id))}>
          Edit
        </Button>
        <Button variant="danger" className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={() => deleteUser(id)}>
          Hapus
        </Button>
      </div>
    )

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark sm:px-6">
        <h1 className="font-heading text-base font-bold text-text-primary dark:text-text-primary-dark sm:text-lg">
          Admin — Manajemen
        </h1>
        <Button className="!px-3 !py-1.5 text-xs sm:text-sm" variant="secondary" onClick={() => router.push('/admin')}>
          ← Kembali
        </Button>
      </nav>

      <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Tabs — scroll on narrow screens */}
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-2 dark:border-border-dark sm:gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-t-md px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                tab === t.id ? 'bg-blue text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label} ({data[t.id]?.length || 0})
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <>
            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
              {data.users?.length === 0 && (
                <Card hover={false} className="py-8 text-center text-text-muted">
                  Belum ada user
                </Card>
              )}
              {data.users?.map((u: any) => (
                <Card key={u.id} hover={false} className="grid gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                      {u.email}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">{u.created_at || ''}</p>
                  </div>

                  {editingId === u.id ? (
                    <EditFields />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-text-secondary">{u.full_name || '-'}</span>
                      <RoleBadge role={u.role} />
                      <span className="text-xs text-text-muted">limit {u.subdomain_limit ?? 0}</span>
                    </div>
                  )}

                  <ActionRow id={u.id} />
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Card hover={false} className="hidden overflow-x-auto p-0 md:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-surface-2 dark:bg-surface-2-dark">
                  <tr className="border-b border-border text-left text-text-muted dark:border-border-dark">
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Limit</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users?.map((u: any) => (
                    <tr key={u.id} className="border-b border-border/50 dark:border-border-dark/50">
                      <td className="max-w-[200px] truncate p-3">{u.email}</td>
                      <td className="p-3">
                        {editingId === u.id ? (
                          <input
                            className={inputCls}
                            value={editForm.full_name}
                            onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                          />
                        ) : (
                          u.full_name || '-'
                        )}
                      </td>
                      <td className="p-3">
                        {editingId === u.id ? (
                          <select
                            className={inputCls}
                            value={editForm.role}
                            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>
                      <td className="p-3">
                        {editingId === u.id ? (
                          <input
                            type="number"
                            min={0}
                            className={`${inputCls} w-20`}
                            value={editForm.subdomain_limit}
                            onChange={e => setEditForm(f => ({ ...f, subdomain_limit: +e.target.value }))}
                          />
                        ) : (
                          u.subdomain_limit ?? 0
                        )}
                      </td>
                      <td className="p-3">
                        <ActionRow id={u.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {tab === 'subdomains' && (
          <>
            <div className="grid gap-3 md:hidden">
              {data.subdomains?.length === 0 && (
                <Card hover={false} className="py-8 text-center text-text-muted">
                  Belum ada subdomain
                </Card>
              )}
              {data.subdomains?.map((s: any) => (
                <Card key={s.id} hover={false} className="grid gap-1 p-4 text-sm">
                  <p className="font-semibold break-all">{s.name}.tepi.my.id</p>
                  <p className="text-text-secondary">Plan: {s.plan}</p>
                  <p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </p>
                  <p className="text-xs text-text-muted">Expires: {s.expires_at || '-'}</p>
                </Card>
              ))}
            </div>
            <Card hover={false} className="hidden overflow-x-auto p-0 md:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="p-3">Name</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subdomains?.map((s: any) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="p-3 font-medium">{s.name}.tepi.my.id</td>
                      <td className="p-3">{s.plan}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted">{s.expires_at || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {tab === 'applications' && (
          <>
            <div className="grid gap-3 md:hidden">
              {data.applications?.length === 0 && (
                <Card hover={false} className="py-8 text-center text-text-muted">
                  Belum ada aplikasi
                </Card>
              )}
              {data.applications?.map((a: any) => (
                <Card key={a.id} hover={false} className="grid gap-1 p-4 text-sm">
                  <p className="font-semibold break-all">{a.subdomain_name}</p>
                  <p className="text-xs text-text-muted">{a.user_id?.slice(0, 8)}…</p>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${
                      a.status === 'approved'
                        ? 'bg-green-50 text-green-700'
                        : a.status === 'pending'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {a.status}
                  </span>
                  <p className="text-xs text-text-muted">{a.created_at}</p>
                </Card>
              ))}
            </div>
            <Card hover={false} className="hidden overflow-x-auto p-0 md:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="p-3">Subdomain</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications?.map((a: any) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="p-3 font-medium">{a.subdomain_name}</td>
                      <td className="p-3">{a.user_id?.slice(0, 8)}…</td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            a.status === 'approved'
                              ? 'bg-green-50 text-green-700'
                              : a.status === 'pending'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted">{a.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}
