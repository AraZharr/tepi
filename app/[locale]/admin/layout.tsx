import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureUserRecord } from '@/lib/users'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { redirect('/login') }
  if (user.id !== process.env.ADMIN_USER_ID) { redirect('/dashboard') }

  // ensure user record exists
  try { await ensureUserRecord(user) } catch { /* ignore */ }

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark">
      {/* Admin sidebar nav */}
      <div className="flex gap-0">
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface dark:border-border-dark dark:bg-surface-dark p-4 gap-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Admin Panel</p>
          <AdminLink href="/admin" label="Review" />
          <AdminLink href="/admin/blog" label="Blog" />
          <AdminLink href="/admin/users" label="Manajemen" />
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
    <a
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark"
    >
      {label}
    </a>
  )
}
