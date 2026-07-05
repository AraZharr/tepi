import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const loginPath = locale === 'id' ? '/login' : `/${locale}/login`

  if (!user) {
    redirect(loginPath)
  }

  if (user.id !== process.env.ADMIN_USER_ID) {
    redirect(locale === 'id' ? '/dashboard' : `/${locale}/dashboard`)
  }

  return <>{children}</>
}
