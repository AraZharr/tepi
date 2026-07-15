import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDB } from '@/lib/db'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }

  // Check role from D1
  let isAdmin = user.id === process.env.ADMIN_USER_ID // fallback ke env
  try {
    const db = await getDB()
    const record = await db.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first() as any
    if (record?.role === 'admin') isAdmin = true
  } catch { /* use fallback */ }

  if (!isAdmin) { redirect('/dashboard') }

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark">
      <div className="flex gap-0">
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface dark:border-border-dark dark:bg-surface-dark p-4 gap-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Admin Panel</p>
          <AdminLink href="/admin" label="Review" />
          <AdminLink href="/admin/blog" label="Blog" />
          <AdminLink href="/admin/users" label="Manajemen" />
          <AdminLink href="/admin/abuse" label="Abuse Reports" />
          <AdminLink href="/admin/activity" label="Activity" />
          <AdminLink href="/admin/payments" label="Payments" />
          <AdminLink href="/admin/settings" label="Settings" />
          <div className="mt-6 pt-4 border-t border-border dark:border-border-dark">
            <AdminLink href="/" label="← Lihat Situs" />
          </div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark">
      {label}
    </a>
  )
}
