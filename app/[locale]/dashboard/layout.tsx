import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureUserRecord } from '@/lib/users'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(locale === 'id' ? '/login' : `/${locale}/login`)
  }

  await ensureUserRecord(user)

  return <>{children}</>
}
