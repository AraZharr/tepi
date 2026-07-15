'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ slug: '', title: '', content: '', excerpt: '', cover_image: '', author_name: '', tags: '', is_published: false, is_featured: false })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetchPosts()
    })
  }, [])

  async function fetchPosts() {
    const res = await fetch('/api/admin/blog')
    if (res.status === 403) { router.push('/dashboard'); return }
    const d = await res.json()
    setPosts(d.posts || [])
    setLoading(false)
  }

  function newPost() {
    setEditId('new')
    setForm({ slug: '', title: '', content: '', excerpt: '', cover_image: '', author_name: '', tags: '', is_published: false, is_featured: false })
  }

  function editPost(post: any) {
    setEditId(post.id)
    setForm({ slug: post.slug, title: post.title, content: post.content || '', excerpt: post.excerpt || '', cover_image: post.cover_image || '', author_name: post.author_name || 'tepi.my.id', tags: post.tags || '', is_published: !!post.is_published, is_featured: !!post.is_featured })
  }

  async function save() {
    if (!form.title || !form.content || !form.slug) return
    setSaving(true)

    const url = editId === 'new' ? '/api/admin/blog' : `/api/admin/blog/${editId}`
    const method = editId === 'new' ? 'POST' : 'PUT'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await res.json()
    setSaving(false)

    if (!res.ok) { setMsg(`❌ ${d.error}`); return }
    setMsg('✅ Tersimpan!')
    setEditId(null)
    fetchPosts()
  }

  async function del(id: string) {
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    fetchPosts()
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin — Blog</h1>
        <Button onClick={() => router.push('/admin')}>← Kembali</Button>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {msg && <p className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">{msg}</p>}

        {editId ? (
          <section>
            <h2 className="font-heading text-xl font-bold mb-4">{editId === 'new' ? 'Buat Post Baru' : 'Edit Post'}</h2>
            <div className="grid gap-4 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Slug</label>
                  <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Author</label>
                  <input value={form.author_name} onChange={e => setForm({...form, author_name: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Excerpt</label>
                <textarea rows={2} value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Content (HTML)</label>
                <textarea rows={12} value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Cover Image URL</label>
                  <input value={form.cover_image} onChange={e => setForm({...form, cover_image: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Tags (comma separated)</label>
                  <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={() => setForm({...form, is_published: !form.is_published})} className="rounded" /> Published</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={() => setForm({...form, is_featured: !form.is_featured})} className="rounded" /> Featured</label>
              </div>
              <div className="flex gap-3">
                <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : '💾 Simpan'}</Button>
                <Button variant="secondary" onClick={() => setEditId(null)}>Batal</Button>
              </div>
            </div>
          </section>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold">Semua Post ({posts.length})</h2>
              <Button onClick={newPost}>+ Baru</Button>
            </div>
            <div className="grid gap-3">
              {posts.map(p => (
                <Card key={p.id} hover={false} className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{p.title}</p>
                      {!!p.is_featured && <span className="text-xs text-yellow-600">★</span>}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.is_published ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{p.is_published ? 'Published' : 'Draft'}</span>
                    </div>
                    <p className="text-sm text-text-muted">/{p.slug} · {p.tags || 'no tags'} · {p.created_at}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" onClick={() => editPost(p)} className="px-3 py-1 text-xs">✏️</Button>
                    <Button variant="danger" onClick={() => setDeleteConfirm(p.id)} className="px-3 py-1 text-xs">🗑️</Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card hover={false} className="w-full max-w-sm p-6 text-center">
            <p className="font-semibold mb-4">Hapus post ini?</p>
            <div className="flex gap-3 justify-center">
              <Button variant="danger" onClick={() => del(deleteConfirm)}>Hapus</Button>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  )
}
