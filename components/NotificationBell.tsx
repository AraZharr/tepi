'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BellIcon, BellDotIcon, XIcon, CheckCheckIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { csrfFetch } from '@/lib/csrf-client'

interface Notif {
  id: number
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: number
  created_at: string
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/user/notifications')
      if (!res.ok) return
      const d = await res.json()
      setNotifs(d.notifications || [])
      setUnread(d.unread || 0)
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchNotifs, 30000)
    return () => clearInterval(iv)
  }, [fetchNotifs])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleClick(notif: Notif) {
    setOpen(false)
    // Mark read
    if (!notif.is_read) {
      await csrfFetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      })
      setUnread((u) => Math.max(0, u - 1))
      setNotifs((ns) => ns.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n)))
    }
    // Navigate
    if (notif.link) {
      router.push(notif.link)
    }
  }

  async function markAllRead() {
    await csrfFetch('/api/user/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setUnread(0)
    setNotifs((ns) => ns.map((n) => ({ ...n, is_read: 1 })))
  }

  // Time ago
  function timeAgo(dateStr: string): string {
    const secs = Math.floor((Date.now() - new Date(dateStr + 'Z').getTime()) / 1000)
    if (secs < 60) return 'baru saja'
    if (secs < 3600) return `${Math.floor(secs / 60)}m`
    if (secs < 86400) return `${Math.floor(secs / 3600)}j`
    if (secs < 2592000) return `${Math.floor(secs / 86400)}h`
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-2 transition"
        aria-label="Notifikasi"
      >
        {unread > 0 ? <BellDotIcon size={20} /> : <BellIcon size={20} />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-border bg-surface shadow-lg z-50 dark:border-border-dark dark:bg-surface-dark">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
            <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">Notifikasi</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue hover:underline">
                <CheckCheckIcon size={14} /> Baca semua
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">Belum ada notifikasi</p>
            ) : (
              notifs.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-0 transition hover:bg-surface-2 dark:border-border-dark/50 dark:hover:bg-surface-2-dark ${!n.is_read ? 'bg-blue/5 dark:bg-blue/10' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-blue'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark truncate">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-text-muted mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
