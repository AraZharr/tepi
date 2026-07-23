'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { csrfFetch } from '@/lib/csrf-client'
import BulkActions from '@/components/ui/BulkActions'

const inputCls =
  'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'

type Tab = 'users' | 'subdomains' | 'applications'

interface User {
  id: string; email: string; full_name?: string; role?: string; subdomain_limit?: number; created_at?: string
}
interface Subdomain {
  id: string; user_id: string; name: string; status: string; plan: string; expires_at?: string;
  target_type?: string; target_value?: string; cf_record_id?: string; created_at?: string;
  ns_addon?: number; ns_records?: string;
}
interface Application {
  id: string; user_id: string; subdomain_name: string; status: string; record_type?: string;
  record_value?: string; reject_reason?: string; created_at?: string
}

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

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    pending: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    approved: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    rejected: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    suspended: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || 'bg-gray-50 text-gray-700'}`}>
      {status}
    </span>
  )
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [data, setData] = useState<{ users: User[]; subdomains: Subdomain[]; applications: Application[]; payments: any[] }>({
    users: [], subdomains: [], applications: [], payments: [],
  })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('users')
  const [busy, setBusy] = useState(false)

  // user form
  const [userForm, setUserForm] = useState({ id: '', email: '', full_name: '', role: 'user', subdomain_limit: 0 })
  const [userMode, setUserMode] = useState<'create' | 'edit' | null>(null)

  // subdomain form
  const [sdForm, setSdForm] = useState({ id: '', user_id: '', name: '', status: 'active', plan: 'free',
    expires_at: '', dns_records: [{ type: 'CNAME', value: '' }],
    ns_addon: false, ns_records: ['', '', '', ''] })
  const [sdMode, setSdMode] = useState<'create' | 'edit' | null>(null)
  const [selectedSubdomains, setSelectedSubdomains] = useState<string[]>([])

  // application form
  const [appForm, setAppForm] = useState({ id: '', user_id: '', subdomain_name: '',
    record_type: 'CNAME', record_value: '', status: 'pending' })
  const [appMode, setAppMode] = useState<'create' | 'edit' | null>(null)

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then((d: any) => {
      if (!d?.user) { router.push('/login'); return }
      fetchData()
    })
  }, [])

  async function fetchData() {
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { router.push('/dashboard'); return }
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  // ===== USERS =====
  function startCreateUser() {
    setUserForm({ id: '', email: '', full_name: '', role: 'user', subdomain_limit: 2 })
    setUserMode('create')
  }
  function startEditUser(u: User) {
    setUserForm({
      id: u.id, email: u.email, full_name: u.full_name || '',
      role: u.role || 'user', subdomain_limit: u.subdomain_limit ?? 2,
    })
    setUserMode('edit')
  }
  async function saveUser() {
    if (!userForm.email) return alert('Email wajib')
    setBusy(true)
    const isCreate = userMode === 'create'
    const res = await csrfFetch('/api/admin/users', {
      method: isCreate ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm),
    })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) return alert(j.error || 'Gagal simpan user')
    setUserMode(null)
    fetchData()
  }
  async function deleteUser(id: string) {
    if (!confirm('Hapus user ini? Subdomain dan pengajuan terkait akan tetap ada (orphan).')) return
    setBusy(true)
    const res = await csrfFetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) fetchData()
    else alert('Gagal hapus user')
  }

  // ===== SUBDOMAINS =====
    function startCreateSubdomain() {
      setSdForm({ id: '', user_id: '', name: '', status: 'active', plan: 'free',
        expires_at: '', dns_records: [{ type: 'CNAME', value: '' }],
        ns_addon: false, ns_records: ['', '', '', ''] })
      setSdMode('create')
    }
    function startEditSubdomain(s: Subdomain) {
      const records = s.target_type && s.target_value
        ? [{ type: s.target_type, value: s.target_value }]
        : [{ type: 'CNAME', value: '' }]
      const nsRecords = s.ns_records ? safeJsonParse(s.ns_records) : []
      // Pad to 4 entries
      while (nsRecords.length < 4) nsRecords.push('')
      setSdForm({
        id: s.id, user_id: s.user_id, name: s.name, status: s.status, plan: s.plan,
        expires_at: s.expires_at ? String(s.expires_at).slice(0, 10) : '',
        dns_records: records,
        ns_addon: s.ns_addon || false,
        ns_records: nsRecords.slice(0, 4),
      })
      setSdMode('edit')
    }
    async function saveSubdomain() {
      if (!sdForm.name || !sdForm.user_id) return alert('Nama subdomain & user_id wajib')
      // Validate DNS records
      const validRecords = sdForm.dns_records.filter(r => r.type && r.value.trim())
      if (validRecords.length === 0) return alert('Minimal 1 DNS record harus diisi')
      if (validRecords.length > 4) return alert('Maksimal 4 DNS records')

      // Validate NS addon
      if (sdForm.ns_addon) {
        const validNs = sdForm.ns_records.filter(ns => ns.trim())
        if (validNs.length !== 4) return alert('NS addon butuh tepat 4 nameserver')
        for (const ns of validNs) {
          if (!ns.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) return alert(`NS tidak valid: ${ns}`)
        }
      }

      setBusy(true)
      const isCreate = sdMode === 'create'
      const res = await csrfFetch('/api/admin/users', {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource: 'subdomain',
          ...sdForm,
          dns_records: JSON.stringify(validRecords),
          ns_addon: sdForm.ns_addon ? 1 : 0,
          ns_records: sdForm.ns_addon ? JSON.stringify(sdForm.ns_records.filter(ns => ns.trim())) : null,
          // Backward compat
          target_type: validRecords[0]?.type || 'CNAME',
          target_value: validRecords[0]?.value || '',
        }),
      })
      const j = await res.json()
      setBusy(false)
      if (!res.ok) return alert(j.error || 'Gagal simpan subdomain')
      setSdMode(null)
      fetchData()
    }
  async function deleteSubdomain(id: string) {
    if (!confirm('Hapus subdomain ini? Record Cloudflare tidak otomatis dihapus.')) return
    setBusy(true)
    const res = await csrfFetch('/api/admin/users', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'subdomain', id }),
    })
    setBusy(false)
    if (res.ok) fetchData()
    else alert('Gagal hapus subdomain')
  }

  // ===== APPLICATIONS =====
  function startCreateApplication() {
    setAppForm({ id: '', user_id: '', subdomain_name: '', record_type: 'CNAME', record_value: '', status: 'pending' })
    setAppMode('create')
  }
  function startEditApplication(a: Application) {
    setAppForm({
      id: a.id, user_id: a.user_id, subdomain_name: a.subdomain_name,
      record_type: a.record_type || 'CNAME', record_value: a.record_value || '', status: a.status,
    })
    setAppMode('edit')
  }
  async function saveApplication() {
    if (!appForm.subdomain_name || !appForm.user_id) return alert('Nama subdomain & user_id wajib')
    setBusy(true)
    const isCreate = appMode === 'create'
    const res = await csrfFetch('/api/admin/users', {
      method: isCreate ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'application', ...appForm }),
    })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) return alert(j.error || 'Gagal simpan pengajuan')
    setAppMode(null)
    fetchData()
  }
  async function deleteApplication(id: string) {
    if (!confirm('Hapus pengajuan ini?')) return
    setBusy(true)
    const res = await csrfFetch('/api/admin/users', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'application', id }),
    })
    setBusy(false)
    if (res.ok) fetchData()
    else alert('Gagal hapus pengajuan')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark">
        <p className="text-text-muted">Memuat...</p>
      </main>
    )
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'users', label: 'Users', count: data.users.length },
    { id: 'subdomains', label: 'Subdomains', count: data.subdomains.length },
    { id: 'applications', label: 'Applications', count: data.applications.length },
  ]

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
        {/* Tabs */}
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
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* ===== USERS TAB ===== */}
        {tab === 'users' && (
          <>
            <div className="mb-4 flex justify-end">
              <Button className="!px-3 !py-1.5 text-xs" onClick={startCreateUser}>+ User Baru</Button>
            </div>

            {userMode && (
              <Card hover={false} className="mb-4 grid gap-2 p-4">
                <p className="text-sm font-semibold">{userMode === 'create' ? 'Tambah User' : 'Edit User'}</p>
                <input className={inputCls} placeholder="Email" value={userForm.email}
                  onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
                <input className={inputCls} placeholder="Nama lengkap" value={userForm.full_name}
                  onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select className={inputCls} value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <input type="number" min={0} className={inputCls} placeholder="Subdomain limit" value={userForm.subdomain_limit}
                    onChange={e => setUserForm(f => ({ ...f, subdomain_limit: +e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={saveUser}>
                    {busy ? '...' : 'Simpan'}
                  </Button>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setUserMode(null)}>
                    Batal
                  </Button>
                </div>
              </Card>
            )}

            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
              {data.users.length === 0 && (
                <Card hover={false} className="py-8 text-center text-text-muted">Belum ada user</Card>
              )}
              {data.users.map(u => (
                <Card key={u.id} hover={false} className="grid gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.email}</p>
                    <p className="text-xs text-text-muted">{u.created_at}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-text-secondary">{u.full_name || '-'}</span>
                    <RoleBadge role={u.role || 'user'} />
                    <span className="text-xs text-text-muted">limit {u.subdomain_limit ?? 0}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="!px-3 !py-1.5 text-xs" onClick={() => startEditUser(u)}>Edit</Button>
                    <Button variant="danger" className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={() => deleteUser(u.id)}>Hapus</Button>
                  </div>
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
                  {data.users.map(u => (
                    <tr key={u.id} className="border-b border-border/50 dark:border-border-dark/50">
                      <td className="max-w-[200px] truncate p-3">{u.email}</td>
                      <td className="p-3">{u.full_name || '-'}</td>
                      <td className="p-3"><RoleBadge role={u.role || 'user'} /></td>
                      <td className="p-3">{u.subdomain_limit ?? 0}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button className="!px-2 !py-1 text-xs" onClick={() => startEditUser(u)}>Edit</Button>
                          <Button variant="danger" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => deleteUser(u.id)}>Hapus</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}

        {/* ===== SUBDOMAINS TAB ===== */}
          {tab === 'subdomains' && (
            <>
              <div className="mb-4 flex justify-between items-center">
                <Button className="!px-3 !py-1.5 text-xs" onClick={startCreateSubdomain}>+ Subdomain Baru</Button>
                {selectedSubdomains.length > 0 && (
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setSelectedSubdomains([])}>
                    Batal Pilih ({selectedSubdomains.length})
                  </Button>
                )}
              </div>

            {sdMode && (
                          <Card hover={false} className="mb-4 grid gap-2 p-4">
                            <p className="text-sm font-semibold">{sdMode === 'create' ? 'Tambah Subdomain' : 'Edit Subdomain'}</p>
                            <input className={inputCls} placeholder="User ID" value={sdForm.user_id}
                              onChange={e => setSdForm(f => ({ ...f, user_id: e.target.value }))} />
                            <div className="flex items-center gap-2">
                              <input className={inputCls} placeholder="nama" value={sdForm.name}
                                onChange={e => setSdForm(f => ({ ...f, name: e.target.value }))} />
                              <span className="text-sm text-text-muted">.tepi.my.id</span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select className={inputCls} value={sdForm.status}
                                onChange={e => setSdForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="active">active</option>
                                <option value="pending">pending</option>
                                <option value="suspended">suspended</option>
                              </select>
                              <select className={inputCls} value={sdForm.plan}
                                onChange={e => setSdForm(f => ({ ...f, plan: e.target.value }))}>
                                <option value="free">free</option>
                                <option value="paid">paid</option>
                              </select>
                            </div>
                            <input type="date" className={inputCls} placeholder="Expires" value={sdForm.expires_at}
                              onChange={e => setSdForm(f => ({ ...f, expires_at: e.target.value }))} />
                            {/* DNS Records - Multiple */}
                            <div className="border-t border-border pt-2 mt-2">
                              <p className="text-xs font-semibold text-text-secondary mb-2">DNS Records</p>
                              {sdForm.dns_records.map((rec, idx) => (
                                <div key={idx} className="flex gap-2 mb-2 items-center">
                                  <select className={inputCls} style={{width: '90px'}} value={rec.type}
                                    onChange={e => {
                                      const updated = [...sdForm.dns_records]
                                      updated[idx] = { ...updated[idx], type: e.target.value }
                                      setSdForm(f => ({ ...f, dns_records: updated }))
                                    }}>
                                    <option value="CNAME">CNAME</option>
                                    <option value="A">A</option>
                                    <option value="TXT">TXT</option>
                                  </select>
                                  <input className={inputCls} flex placeholder={rec.type === 'CNAME' ? 'contoh.vercel.app' : rec.type === 'A' ? '1.2.3.4' : 'value'}
                                    value={rec.value}
                                    onChange={e => {
                                      const updated = [...sdForm.dns_records]
                                      updated[idx] = { ...updated[idx], value: e.target.value }
                                      setSdForm(f => ({ ...f, dns_records: updated }))
                                    }} />
                                  {sdForm.dns_records.length > 1 && (
                                    <Button variant="secondary" className="!px-2 !py-1.5 text-xs h-8"
                                      onClick={() => {
                                        const updated = sdForm.dns_records.filter((_, i) => i !== idx)
                                        setSdForm(f => ({ ...f, dns_records: updated }))
                                      }}>
                                      Hapus
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button variant="secondary" className="!px-2 !py-1.5 text-xs"
                                onClick={() => setSdForm(f => ({ ...f, dns_records: [...f.dns_records, { type: 'CNAME', value: '' }] }))}>
                                + Tambah Record
                              </Button>
                            </div>
                            {/* NS Add-on (Paid only) */}
                            <div className="border-t border-border pt-2 mt-2">
                              <label className="flex items-start gap-2 mb-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sdForm.ns_addon}
                                  onChange={e => setSdForm(f => ({ ...f, ns_addon: e.target.checked }))}
                                  className="mt-1 rounded border-border bg-bg text-blue focus:ring-blue/20"
                                />
                                <span className="text-sm font-semibold text-text-primary">
                                  NS Add-on (+Rp1.000/tahun) — Delegasi nameserver penuh
                                </span>
                              </label>
                              {sdForm.ns_addon && (
                                <div className="ml-6 grid gap-2 sm:grid-cols-2">
                                  {sdForm.ns_records.map((ns, idx) => (
                                    <div key={idx} className="grid gap-2 sm:grid-cols-[auto_1fr]">
                                      <span className="text-sm text-text-muted shrink-0 w-10">NS{idx + 1}</span>
                                      <input
                                        type="text"
                                        placeholder="ns1.provider.com"
                                        value={ns}
                                        onChange={e => {
                                          const updated = [...sdForm.ns_records]
                                          updated[idx] = e.target.value.toLowerCase().replace(/\.$/, '')
                                          setSdForm(f => ({ ...f, ns_records: updated }))
                                        }}
                                        className={inputCls}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="mt-1 text-xs text-text-muted">
                                Tambah 4 nameserver untuk delegasi zone penuh (contoh: Cloudflare, AWS Route53)
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={saveSubdomain}>
                                {busy ? '...' : 'Simpan'}
                              </Button>
                              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setSdMode(null)}>Batal</Button>
                            </div>
                          </Card>
                        )}

            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
              {data.subdomains.length === 0 && (
                <Card hover={false} className="py-8 text-center text-text-muted">Belum ada subdomain</Card>
              )}
              {data.subdomains.map(s => {
                                const isSelected = selectedSubdomains.includes(s.id)
                                return (
                                  <Card key={s.id} hover={false} className={`grid gap-1 p-4 text-sm ${isSelected ? 'ring-2 ring-blue/50 bg-blue/5' : ''}`}>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => setSelectedSubdomains(prev =>
                                          prev.includes(s.id)
                                            ? prev.filter(x => x !== s.id)
                                            : [...prev, s.id]
                                        )}
                                        className="mt-1 shrink-0 rounded border-border bg-bg text-blue focus:ring-blue/20 dark:border-border-dark dark:bg-surface-dark"
                                      />
                                      <div>
                                        <p className="font-semibold break-all">{s.name}.tepi.my.id</p>
                                        <p className="text-text-secondary">
                                          {s.target_type && s.target_value ? `${s.target_type} → ${s.target_value}` : 'Belum dikonfigurasi'}
                                          {s.ns_addon && s.ns_records && (
                                            <>
                                              <br />
                                              <span className="text-xs text-blue">NS Add-on: {safeJsonParse(s.ns_records).length} NS</span>
                                            </>
                                          )}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                          <StatusBadge status={s.status} />
                                          <span className="text-text-muted">Plan: {s.plan}</span>
                                          {s.expires_at && <span className="text-text-muted">Exp: {String(s.expires_at).slice(0, 10)}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                          <Button className="!px-3 !py-1.5 text-xs" onClick={() => startEditSubdomain(s)}>Edit</Button>
                                          <Button variant="danger" className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={() => deleteSubdomain(s.id)}>Hapus</Button>
                                        </div>
                                      </div>
                                    </label>
                                  </Card>
                                )
                              })}
            </div>

            {/* Desktop: table */}
            <Card hover={false} className="hidden overflow-x-auto p-0 md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface-2 dark:bg-surface-2-dark">
                  <tr className="border-b border-border text-left text-text-muted dark:border-border-dark">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Record</th>
                    <th className="p-3 font-medium">NS Add-on</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Plan</th>
                    <th className="p-3 font-medium">Expires</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subdomains.map(s => {
                    const nsRecords = s.ns_records ? safeJsonParse(s.ns_records) : []
                    return (
                      <tr key={s.id} className="border-b border-border/50 dark:border-border-dark/50">
                        <td className="p-3 font-medium">{s.name}.tepi.my.id</td>
                        <td className="p-3 text-text-muted text-xs">{s.target_type} → {s.target_value || '-'}</td>
                        <td className="p-3 text-xs">
                          {s.ns_addon && nsRecords.length > 0 ? (
                            <span className="text-blue">{nsRecords.length} NS</span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="p-3"><StatusBadge status={s.status} /></td>
                        <td className="p-3">{s.plan}</td>
                        <td className="p-3 text-text-muted text-xs">{s.expires_at ? String(s.expires_at).slice(0, 10) : '-'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button className="!px-2 !py-1 text-xs" onClick={() => startEditSubdomain(s)}>Edit</Button>
                            <Button variant="danger" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => deleteSubdomain(s.id)}>Hapus</Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
                      </>
                    )}
                  </>}

                  {/* Bulk Actions Bar */}
                  {selectedSubdomains.length > 0 && (
                    <BulkActions
                      subdomains={data.subdomains.filter(s => selectedSubdomains.includes(s.id))}
                      onComplete={() => {
                        setSelectedSubdomains([])
                        fetchData()
                      }}
                      isAdmin={true}
                    />
                  )

                  {/* ===== APPLICATIONS TAB ===== */}
        {tab === 'applications' && (
          <>
            <div className="mb-4 flex justify-end">
              <Button className="!px-3 !py-1.5 text-xs" onClick={startCreateApplication}>+ Pengajuan Baru</Button>
            </div>

            {appMode && (
              <Card hover={false} className="mb-4 grid gap-2 p-4">
                <p className="text-sm font-semibold">{appMode === 'create' ? 'Tambah Pengajuan' : 'Edit Pengajuan'}</p>
                <input className={inputCls} placeholder="User ID" value={appForm.user_id}
                  onChange={e => setAppForm(f => ({ ...f, user_id: e.target.value }))} />
                <div className="flex items-center gap-2">
                  <input className={inputCls} placeholder="nama" value={appForm.subdomain_name}
                    onChange={e => setAppForm(f => ({ ...f, subdomain_name: e.target.value }))} />
                  <span className="text-sm text-text-muted">.tepi.my.id</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select className={inputCls} value={appForm.record_type}
                    onChange={e => setAppForm(f => ({ ...f, record_type: e.target.value }))}>
                    <option value="CNAME">CNAME</option>
                    <option value="A">A</option>
                    <option value="TXT">TXT</option>
                  </select>
                  <input className={inputCls} placeholder="Record value" value={appForm.record_value}
                    onChange={e => setAppForm(f => ({ ...f, record_value: e.target.value }))} />
                  <select className={inputCls} value={appForm.status}
                    onChange={e => setAppForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={saveApplication}>
                    {busy ? '...' : 'Simpan'}
                  </Button>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setAppMode(null)}>Batal</Button>
                </div>
              </Card>
            )}

            {/* Mobile: cards */}
            <div className="grid gap-3 md:hidden">
              {data.applications.length === 0 && (
                <Card hover={false} className="py-8 text-center text-text-muted">Belum ada pengajuan</Card>
              )}
              {data.applications.map(a => (
                <Card key={a.id} hover={false} className="grid gap-1 p-4 text-sm">
                  <p className="font-semibold break-all">{a.subdomain_name}.tepi.my.id</p>
                  <p className="text-xs text-text-muted">
                    {a.record_type} → {a.record_value || '-'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <StatusBadge status={a.status} />
                    <span className="text-text-muted">{a.created_at}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button className="!px-3 !py-1.5 text-xs" onClick={() => startEditApplication(a)}>Edit</Button>
                    <Button variant="danger" className="!px-3 !py-1.5 text-xs" disabled={busy} onClick={() => deleteApplication(a.id)}>Hapus</Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Card hover={false} className="hidden overflow-x-auto p-0 md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface-2 dark:bg-surface-2-dark">
                  <tr className="border-b border-border text-left text-text-muted dark:border-border-dark">
                    <th className="p-3 font-medium">Subdomain</th>
                    <th className="p-3 font-medium">Record</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.applications.map(a => (
                    <tr key={a.id} className="border-b border-border/50 dark:border-border-dark/50">
                      <td className="p-3 font-medium">{a.subdomain_name}.tepi.my.id</td>
                      <td className="p-3 text-text-muted text-xs">{a.record_type} → {a.record_value || '-'}</td>
                      <td className="p-3"><StatusBadge status={a.status} /></td>
                      <td className="p-3 text-text-muted text-xs font-mono">{a.user_id?.slice(0, 8)}…</td>
                      <td className="p-3 text-text-muted text-xs">{a.created_at}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button className="!px-2 !py-1 text-xs" onClick={() => startEditApplication(a)}>Edit</Button>
                          <Button variant="danger" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => deleteApplication(a.id)}>Hapus</Button>
                        </div>
                      </td>
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
