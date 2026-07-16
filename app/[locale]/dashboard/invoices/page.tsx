'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(({ user }) => {
      if (!user) { router.push('/login'); return }
      fetchInvoices()
    })
  }, [])

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    success: 'bg-green-50 text-green-700',
    failed: 'bg-red-50 text-red-700',
    cancelled: 'bg-gray-50 text-gray-600',
  }

  async function fetchInvoices() {
    const res = await fetch('/api/user/invoices')
    const data = await res.json()
    setInvoices(data.invoices)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">📄 Invoice</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>← Dashboard</Button>
        </div>
      </nav>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <p className="text-text-muted">Memuat...</p>
        ) : invoices.length === 0 ? (
          <Card hover={false} className="p-8 text-center">
            <p className="text-4xl mb-4">🧾</p>
            <p className="text-text-secondary">Belum ada invoice. Upgrade subdomain untuk membuat invoice.</p>
            <Button className="mt-4" onClick={() => router.push('/pricing')}>Lihat Harga</Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {invoices.map((inv: any) => (
              <Card key={inv.id} hover={false} className="flex items-center justify-between p-4">
                <div>
                  <p
                    className="font-mono text-sm font-semibold text-blue cursor-pointer hover:underline"
                    onClick={() => router.push(`/dashboard/invoices/${inv.invoice_number}`)}
                  >
                    {inv.invoice_number}
                  </p>
                  <p className="text-sm text-text-secondary mt-0.5">{inv.subdomain_name}.tepi.my.id</p>
                  <p className="text-xs text-text-muted mt-1">{inv.created_at}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(inv.amount)}
                  </p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold mt-1 ${statusColor[inv.status] || 'bg-gray-50'}`}>
                    {inv.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
