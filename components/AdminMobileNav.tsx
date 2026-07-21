'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'

export default function AdminMobileNav({ email }: { email: string }) {
  const router = useRouter()

  return (
    <nav className="md:hidden flex items-center justify-between border-b border-border bg-surface px-6 py-3 dark:border-border-dark dark:bg-surface-dark">
      <h1 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark">Admin</h1>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <span className="text-sm text-text-secondary">{email}</span>
      </div>
    </nav>
  )
}