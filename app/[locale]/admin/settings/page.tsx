'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetchSettings()
    })
  }, [])

  async function fetchSettings() {
    const res = await fetch('/api/admin/settings')
    if (res.status === 403) { router.push('/dashboard'); return }
    const d = await res.json()
    setSettings(d.settings || {})
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const update = (key: string, value: string) => setSettings({ ...settings, [key]: value })

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin — Settings</h1>
        <Button onClick={() => router.push('/admin')}>← Kembali</Button>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="grid gap-4">
          <Card hover={false} className="p-5">
            <h3 className="font-heading font-bold mb-3">Site Info</h3>
            <div className="grid gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Site Name</label><input value={settings.site_name || ''} onChange={e => update('site_name', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Description</label><textarea rows={2} value={settings.site_description || ''} onChange={e => update('site_description', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Footer Text</label><input value={settings.footer_text || ''} onChange={e => update('footer_text', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
            </div>
          </Card>

          <Card hover={false} className="p-5">
            <h3 className="font-heading font-bold mb-3">Contact</h3>
            <div className="grid gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">WhatsApp Number</label><input value={settings.wa_number || ''} onChange={e => update('wa_number', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Email</label><input value={settings.social_email || ''} onChange={e => update('social_email', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
            </div>
          </Card>

          <Card hover={false} className="p-5">
            <h3 className="font-heading font-bold mb-3">Social Links</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">GitHub</label><input value={settings.social_github || ''} onChange={e => update('social_github', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Twitter/X</label><input value={settings.social_twitter || ''} onChange={e => update('social_twitter', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Instagram</label><input value={settings.social_instagram || ''} onChange={e => update('social_instagram', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">TikTok</label><input value={settings.social_tiktok || ''} onChange={e => update('social_tiktok', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
            </div>
          </Card>

          <Card hover={false} className="p-5">
            <h3 className="font-heading font-bold mb-3">Ads & Maintenance</h3>
            <div className="grid gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.ads_enabled === 'true'} onChange={e => update('ads_enabled', e.target.checked ? 'true' : 'false')} className="rounded" /> Ads Enabled</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.maintenance_mode === 'true'} onChange={e => update('maintenance_mode', e.target.checked ? 'true' : 'false')} className="rounded" /> Maintenance Mode (non-admin users see 503)</label>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">OG Image URL (default)</label><input value={settings.og_image_default || ''} onChange={e => update('og_image_default', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Header Ad Code</label><textarea rows={2} value={settings.ads_header_code || ''} onChange={e => update('ads_header_code', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
              <div><label className="mb-1 block text-xs font-semibold text-text-muted">Footer Ad Code</label><textarea rows={2} value={settings.ads_footer_code || ''} onChange={e => update('ads_footer_code', e.target.value)} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-blue focus:outline-none dark:border-border-dark dark:bg-surface-dark" /></div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Button onClick={save} disabled={saving}>
            {saving ? 'Menyimpan...' : saved ? '✅ Tersimpan!' : '💾 Simpan Pengaturan'}
          </Button>
        </div>
      </div>
    </main>
  )
}
