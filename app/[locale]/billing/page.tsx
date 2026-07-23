import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { setRequestLocale } from 'next-intl/server'
import SiteNav from '@/components/SiteNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Riwayat Pembayaran | tepi.my.id',
  description: 'Lihat riwayat pembayaran dan invoice untuk subdomain Anda',
}

async function getUserData() {
  const user = await getSessionUser()
  if (!user) notFound()

  const db = await getDB()
  
  // Get all payments for user with subdomain info
  const payments = await db.prepare(`
    SELECT p.*, s.name as subdomain_name, s.plan, s.expires_at
    FROM payments p
    LEFT JOIN subdomains s ON s.id = p.subdomain_id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).bind(user.id).all()

  // Get all subdomains for context
  const subdomains = await db.prepare(`
    SELECT id, name, plan, expires_at, auto_renew
    FROM subdomains
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC
  `).bind(user.id).all()

  return { user, payments: payments.results ?? [], subdomains: subdomains.results ?? [] }
}

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const { user, payments, subdomains } = await getUserData()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr.replace(' ', 'T') + 'Z').toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      pending: { label: 'Menunggu', class: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' },
      paid: { label: 'Lunas', class: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
      success: { label: 'Berhasil', class: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
      failed: { label: 'Gagal', class: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' },
      cancelled: { label: 'Dibatalkan', class: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300' },
    }
    return map[status] || { label: status, class: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300' }
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <SiteNav />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-text-primary dark:text-text-primary-dark mb-2">
            Riwayat Pembayaran
          </h1>
          <p className="text-text-secondary dark:text-text-secondary-dark">
            Kelola invoice dan riwayat pembayaran untuk subdomain Anda
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card hover={false} className="bg-blue-subtle dark:bg-blue-subtle-dark border-blue dark:border-blue-dark">
            <div className="p-4">
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">Total Subdomain Aktif</p>
              <p className="font-heading text-2xl font-bold text-blue dark:text-blue-light mt-1">
                {subdomains.length}
              </p>
            </div>
          </Card>
          <Card hover={false} className="bg-green-subtle dark:bg-green-subtle-dark border-green dark:border-green-dark">
            <div className="p-4">
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">Total Pembayaran Berhasil</p>
              <p className="font-heading text-2xl font-bold text-green dark:text-green-light mt-1">
                {payments.filter(p => p.status === 'paid' || p.status === 'success').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('id-ID')}
              </p>
            </div>
          </Card>
          <Card hover={false} className="bg-purple-subtle dark:bg-purple-subtle-dark border-purple dark:border-purple-dark">
            <div className="p-4">
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">Invoice Menunggu</p>
              <p className="font-heading text-2xl font-bold text-purple dark:text-purple-light mt-1">
                {payments.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </Card>
        </div>

        {/* Payment History Table */}
        <section>
          <h2 className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark mb-4">
            Riwayat Transaksi
          </h2>

          {payments.length === 0 ? (
            <Card hover={false} className="py-12 text-center">
              <p className="text-text-secondary dark:text-text-secondary-dark mb-4">
                Belum ada riwayat pembayaran
              </p>
              <Button variant="primary" asChild>
                <a href="/dashboard">Klaim Subdomain Pertama</a>
              </Button>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-border-dark text-left">
                    <th className="pb-3 pr-4 font-semibold text-text-primary">Subdomain</th>
                    <th className="pb-3 pr-4 font-semibold text-text-primary">Invoice</th>
                    <th className="pb-3 pr-4 font-semibold text-text-primary text-right">Nominal</th>
                    <th className="pb-3 pr-4 font-semibold text-text-primary">Status</th>
                    <th className="pb-3 pr-4 font-semibold text-text-primary">Tanggal</th>
                    <th className="pb-3 pr-4 font-semibold text-text-primary text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 dark:divide-border-dark/50">
                  {payments.map((p) => {
                    const status = getStatusBadge(p.status as string)
                    return (
                      <tr key={p.id} className="hover:bg-surface/50 dark:hover:bg-surface-dark/50">
                        <td className="py-4 pr-4">
                          <p className="font-medium text-text-primary dark:text-text-primary-dark">
                            {p.subdomain_name ? `${p.subdomain_name}.tepi.my.id` : '—'}
                          </p>
                          {p.subdomain_name && p.plan && (
                            <p className="text-xs text-text-muted">{p.plan} • {p.expires_at ? `Exp: ${formatDate(p.expires_at)}` : 'Tidak kadaluarsa'}</p>
                          )}
                        </td>
                        <td className="py-4 pr-4 font-mono text-text-secondary dark:text-text-secondary-dark">
                          {p.invoice_number || `#${p.order_id?.slice(-8).toUpperCase()}`}
                        </td>
                        <td className="py-4 pr-4 text-right font-semibold text-text-primary dark:text-text-primary-dark">
                          {formatCurrency(p.amount || 0)}
                          {p.fee && <span className="text-xs text-text-muted ml-1">(+fee {formatCurrency(p.fee)})</span>}
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-text-secondary dark:text-text-secondary-dark whitespace-nowrap">
                          {formatDate(p.created_at as string)}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.receipt_url && (
                              <a
                                href={p.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue hover:underline"
                              >
                                Unduh Receipt
                              </a>
                            )}
                            {(p.status === 'pending' || p.status === 'paid') && p.subdomain_id && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="!px-3 !py-1.5 text-xs"
                                asChild
                              >
                                <a href={`/api/payment/create?subdomain_id=${p.subdomain_id}`}>
                                  Bayar / Perpanjang
                                </a>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Subdomains without payments */}
          {subdomains.length > 0 && (
            <div className="mt-8">
              <h3 className="font-heading text-lg font-semibold text-text-primary dark:text-text-primary-dark mb-4">
                Subdomain Aktif (Belum Ada Pembayaran)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {subdomains.filter(s => !payments.some(p => p.subdomain_id === s.id)).map((s) => (
                  <Card key={s.id} hover={false} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-text-primary dark:text-text-primary-dark">
                        {s.name}.tepi.my.id
                      </p>
                      <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                        {s.plan} • {s.expires_at ? `Exp: ${formatDate(s.expires_at)}` : 'Tidak kadaluarsa'}
                        {s.auto_renew && <span className="ml-2 text-xs text-green">🔄 Auto-renew ON</span>}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      asChild
                    >
                      <a href={`/api/payment/create?subdomain_id=${s.id}`}>
                        Bayar Sekarang
                      </a>
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}