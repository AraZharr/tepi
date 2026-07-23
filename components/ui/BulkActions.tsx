'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface BulkActionsProps {
  subdomains: Array<{ id: number; name: string; plan: string; status: string; ns_addon: number }>
  onComplete: () => void
  isAdmin?: boolean
}

export default function BulkActions({ subdomains, onComplete, isAdmin = false }: BulkActionsProps) {
  const [selected, setSelected] = useState<number[]>([])
  const [action, setAction] = useState<'renew' | 'suspend' | 'unsuspend' | 'delete' | 'ns_update'>('renew')
  const [loading, setLoading] = useState(false)
  const [nsRecords, setNsRecords] = useState(['', '', '', ''])
  const [results, setResults] = useState<{ success: number; total: number } | null>(null)

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectAll = () => {
    setSelected(prev => prev.length === subdomains.length ? [] : subdomains.map(s => s.id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selected.length === 0) return

    setLoading(true)
    try {
      const body: any = { action, subdomainIds: selected }
      if (action === 'ns_update') body.ns_records = nsRecords

      const endpoint = isAdmin ? '/api/admin/bulk' : '/api/user/bulk'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      setResults({ success: data.successCount || 0, total: selected.length })
      onComplete()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (selected.length === 0) return null

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-md w-full shadow-lg border-yellow/50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Aksi Massal ({selected.length})</h3>
          <button
            onClick={() => setSelected([])}
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={action}
            onChange={e => setAction(e.target.value as any)}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="renew">Perpanjang 1 Tahun (Paid)</option>
            {isAdmin && (
              <>
                <option value="suspend">Suspend</option>
                <option value="unsuspend">Unsuspend</option>
                <option value="delete">Hapus</option>
                <option value="ns_update">Update NS Records</option>
              </>
            )}
          </select>

          {action === 'ns_update' && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">Masukkan 4 nameserver baru:</p>
              {nsRecords.map((_, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`ns${i + 1}.example.com`}
                  value={nsRecords[i]}
                  onChange={e => {
                    const arr = [...nsRecords]
                    arr[i] = e.target.value
                    setNsRecords(arr)
                  }}
                  className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm"
                  required
                />
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Memproses...' : `Jalankan ${action}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelected([])}>
              Batal
            </Button>
          </div>

          {results && (
            <div className={`p-3 rounded text-sm ${
              results.success === results.total ? 'bg-green/10 text-green' : 'bg-yellow/10 text-yellow'
            }`}>
              Berhasil: {results.success} / {results.total}
            </div>
          )}
        </form>
      </div>
    </Card>
  )
}