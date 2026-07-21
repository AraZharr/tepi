'use client'

import { useRouter } from 'next/navigation'
import { LogOutIcon } from 'lucide-react'
import { csrfFetch } from '@/lib/csrf-client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await csrfFetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={handleLogout}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-red transition dark:hover:bg-surface-2-dark dark:hover:text-red w-full">
      <LogOutIcon size={16} />
      Logout
    </button>
  )
}