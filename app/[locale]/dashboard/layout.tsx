import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const user = await getSessionUser()

  if (!user) {
    redirect(locale === 'id' ? '/login' : `/${locale}/login`)
  }

  // Ensure user record exists in D1
  const { getDB } = await import('@/lib/db')
  const db = await getDB()
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, username, full_name, role, subdomain_limit, email_verified)
       VALUES (?, ?, ?, ?, 'user', 2, 1)`
    )
    .bind(user.id, user.email, user.username, user.full_name)
    .run()

  return <>{children}</>
}
