'use client'

import { useEffect, useState } from 'react'
import { resolveTheme, setTheme, type Theme } from '@/lib/theme'

/**
 * Tombol toggle dark/light mode.
 * Posisi: pojok kanan atas navbar — lihat design.md §8.
 */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setThemeState(resolveTheme())
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    setThemeState(next)
  }

  // Hindari mismatch hydration — render placeholder sampai mounted di client
  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden="true" />
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-surface dark:border-border-dark dark:text-text-secondary-dark dark:hover:bg-surface-dark"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}
