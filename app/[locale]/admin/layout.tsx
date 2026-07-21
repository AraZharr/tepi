import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import LogoutButton from '@/components/LogoutButton'
import NotificationBell from '@/components/NotificationBell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) { redirect('/login') }

  // Check if user is admin via both DB role and ADMIN_USER_ID
  if (!(await isAdminUser(user.id))) { redirect('/dashboard') }

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
        <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Admin</p>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>

      <div className="flex gap-0">
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-surface dark:border-border-dark dark:bg-surface-dark p-4 gap-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Admin Panel</p>
          <a href="/admin" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark">
            Dashboard
          </a>
          <a href="/admin/blog" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark">
            Blog
          </a>
          <a href="/admin/users" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark">
            Management
          </a>
          <a href="/admin/activity" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark">
            Activity
          </a>
          <a href="/admin/payments" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark">
            Payments
          </a>
          <a href="/admin/settings" className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition dark:hover:bg-surface-2-dark dark:hover:text-text-primary-dark">
            Settings
          </a>
          <div className="mt-3 pt-4 border-t border-border dark:border-border-dark flex flex-col gap-1">
            <LogoutButton />
          </div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
