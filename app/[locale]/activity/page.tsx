import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { getDB } from '@/lib/db'
import { setRequestLocale } from 'next-intl/server'
import SiteNav from '@/components/SiteNav'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Activity Log | tepi.my.id',
  description: 'Lihat riwayat aktivitas akun Anda',
}

async function getActivityLogs(userId: string, limit = 100) {
  const db = await getDB()
  const logs = await db.prepare(`
    SELECT * FROM activity_logs 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).bind(userId, limit).all()
  return logs.results ?? []
}

export default async function ActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const user = await getSessionUser()
  if (!user) notFound()

  const logs = await getActivityLogs(user.id)

  const actionLabels: Record<string, string> = {
    claim: 'Klaim Subdomain',
    approve: 'Disetujui Admin',
    reject: 'Ditolak Admin',
    update_dns: 'Update DNS',
    delete: 'Hapus Subdomain',
    suspend: 'Ditangguhkan',
    payment_paid: 'Pembayaran Berhasil',
    login: 'Login',
    register: 'Registrasi',
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      claim: '📝',
      approve: '✅',
      reject: '❌',
      update_dns: '🔧',
      delete: '🗑️',
      suspend: '⏸️',
      payment_paid: '💰',
      login: '🔐',
      register: '📝',
    }
    return icons[action] || '📋'
  }

  const parseDetail = (detail: string | null) => {
    if (!detail) return null
    try {
      return JSON.parse(detail)
    } catch {
      return { raw: detail }
    }
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <SiteNav />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-text-primary dark:text-text-primary-dark mb-2">
            Log Aktivitas
          </h1>
          <p className="text-text-secondary dark:text-text-secondary-dark">
            Riwayat semua aksi pada akun dan subdomain Anda
          </p>
        </div>

        {logs.length === 0 ? (
          <Card hover={false} className="py-12 text-center">
            <p className="text-text-secondary dark:text-text-secondary-dark mb-4">
              Belum ada aktivitas
            </p>
            <Button asChild>
              <a href="/dashboard">Klaim Subdomain Pertama</a>
            </Button>
          </Card>
        ) : (
          <Card hover={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50">
                    <th className="pb-3 pr-4 text-left font-semibold text-text-primary">Waktu</th>
                    <th className="pb-3 pr-4 text-left font-semibold text-text-primary">Aksi</th>
                    <th className="pb-3 pr-4 text-left font-semibold text-text-primary">Detail</th>
                    <th className="pb-3 pr-4 text-left font-semibold text-text-primary">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 dark:divide-border-dark/50">
                  {logs.map((log) => {
                    const detail = parseDetail(log.detail as string)
                    return (
                      <tr key={log.id} className="hover:bg-surface/50 dark:hover:bg-surface-dark/50">
                        <td className="py-3 pr-4 text-text-secondary dark:text-text-secondary-dark whitespace-nowrap">
                          {formatDate(log.created_at as string)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-2">
                            <span>{getActionIcon(log.action as string)}</span>
                            <span className="font-medium text-text-primary dark:text-text-primary-dark">
                              {actionLabels[log.action as string] || log.action}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-text-secondary dark:text-text-secondary-dark max-w-md">
                          {detail && (
                            <div className="font-mono text-xs">
                              {Object.entries(detail).map(([k, v]) => (
                                <div key={k} className="truncate">
                                  <span className="text-text-muted">{k}:</span>{' '}
                                  <span>{typeof v === 'object' ? JSON.stringify(v) : v}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-text-muted font-mono text-xs">
                          {log.ip_address || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}