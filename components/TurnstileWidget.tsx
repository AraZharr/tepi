'use client'

import { useEffect, useId, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement | string, opts: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
      getResponse: (widgetId?: string) => string
    }
    onTurnstileLoad?: () => void
  }
}

interface Props {
  onVerify: (token: string) => void
  onError?: (msg: string) => void
  theme?: 'light' | 'dark'
}

const SCRIPT_ID = 'cf-turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    return new Promise((resolve) => {
      if (window.turnstile) return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      // already loaded but turnstile not ready
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t)
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(t)
        resolve()
      }, 8000)
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Gagal load script Turnstile'))
    document.head.appendChild(script)
  })
}

export default function TurnstileWidget({ onVerify, onError, theme = 'auto' as any }: Props) {
  const reactId = useId().replace(/:/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)
  const [uiError, setUiError] = useState<string | null>(null)

  onVerifyRef.current = onVerify
  onErrorRef.current = onError

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

  useEffect(() => {
    let cancelled = false

    async function mount() {
      if (!siteKey) {
        const msg =
          'CAPTCHA site key kosong. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY di GH Secrets lalu redeploy.'
        setUiError(msg)
        onErrorRef.current?.(msg)
        return
      }

      try {
        await loadScript()
        if (cancelled || !containerRef.current || !window.turnstile) return

        // Cleanup previous widget in this container
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch { /* ignore */ }
          widgetIdRef.current = null
        }
        containerRef.current.innerHTML = ''

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme === 'auto' ? 'auto' : theme,
          callback: (token: string) => {
            setUiError(null)
            onVerifyRef.current(token)
          },
          'error-callback': () => {
            const msg =
              'Verifikasi gagal. Cek domain tepi.my.id ada di Turnstile Hostnames, atau refresh.'
            setUiError(msg)
            onErrorRef.current?.(msg)
            onVerifyRef.current('') // clear token
          },
          'expired-callback': () => {
            onVerifyRef.current('')
            if (widgetIdRef.current && window.turnstile) {
              try {
                window.turnstile.reset(widgetIdRef.current)
              } catch { /* ignore */ }
            }
          },
          'timeout-callback': () => {
            const msg = 'CAPTCHA timeout. Refresh halaman.'
            setUiError(msg)
            onErrorRef.current?.(msg)
            onVerifyRef.current('')
          },
        })
      } catch (e: any) {
        const msg = e?.message || 'Turnstile gagal diinisialisasi'
        setUiError(msg)
        onErrorRef.current?.(msg)
      }
    }

    mount()

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch { /* ignore */ }
        widgetIdRef.current = null
      }
    }
  }, [siteKey, theme])

  return (
    <div className="my-4 space-y-2">
      <div
        ref={containerRef}
        id={`cf-turnstile-${reactId}`}
        className="flex min-h-[65px] justify-center"
      />
      {uiError && (
        <p className="text-center text-xs text-red-600 dark:text-red-400">{uiError}</p>
      )}
      {!siteKey && (
        <p className="text-center text-xs text-amber-600">
          Site key belum di-build. Admin: set secret + redeploy.
        </p>
      )}
    </div>
  )
}
