'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [inv, setInv] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      fetchInvoice()
    })
  }, [])

  async function fetchInvoice() {
    const res = await fetch(`/api/user/invoices/${params.id}`)
    if (res.status === 404) { router.push('/dashboard/invoices'); return }
    const data = await res.json()
    setInv(data.invoice)
    setLoading(false)
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark"><p className="text-text-muted">Memuat...</p></main>
  if (!inv) return null

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
        <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">📄 Detail Invoice</h1>
        <Button variant="secondary" onClick={() => router.push('/dashboard/invoices')}>← Kembali</Button>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <table className="mx-auto max-w-md w-full text-sm">
          <tbody className="divide-y divide-border dark:divide-border-dark">
            <tr><td className="py-3 text-text-muted pr-6">Invoice</td><td className="py-3 font-mono font-bold text-text-primary">{inv.invoice_number}</td></tr>
            <tr><td className="py-3 text-text-muted">Subdomain</td><td className="py-3">{inv.subdomain_name}.tepi.my.id</td></tr>
            <tr><td className="py-3 text-text-muted">Tipe</td><td className="py-3">Upgrade ke {inv.plan}</td></tr>
            <tr><td className="py-3 text-text-muted">Status</td><td className="py-3">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                inv.status === 'success' ? 'bg-green-50 text-green-700' :
                inv.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                inv.status === 'failed' ? 'bg-red-50 text-red-700' :
                'bg-gray-50 text-gray-600'
              }`}>{inv.status}</span>
            </td></tr>
            <tr><td className="py-3 text-text-muted">Tanggal</td><td className="py-3">{inv.created_at}</td></tr>
            {inv.paid_at && <tr><td className="py-3 text-text-muted">Dibayar</td><td className="py-3">{inv.paid_at}</td></tr>}
            <tr><td className="py-3 text-text-muted">Pembayaran</td><td className="py-3">{inv.payment_method || '-'}</td></tr>
            <tr className="border-t-2 border-border dark:border-border-dark"><td className="py-3 text-text-muted font-semibold">Total</td><td className="py-3 font-bold text-lg">{formatCurrency(inv.amount)}</td></tr>
          </tbody>
        </table>

        <div className="mt-8 text-sm text-text-muted text-center">
          tepi.my.id &mdash; Free subdomain for developers Indonesia
        </div>
      </div>
    </main>
  )
}
