'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: string, opts: any) => string
      reset: (widgetId: string) => void
      getResponse: (widgetId: string) => string
    }
  }
}

interface Props {
  onVerify: (token: string) => void
  theme?: 'light' | 'dark'
}

export default function TurnstileWidget({ onVerify, theme = 'light' }: Props) {
  const widgetRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA' // invisible key fallback

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Load Turnstile script
    if (!document.getElementById('cf-turnstile-script')) {
      const script = document.createElement('script')
      script.id = 'cf-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    // Wait for script to load then render
    const checkTurnstile = () => {
      if (window.turnstile) {
        widgetRef.current = window.turnstile.render('#cf-turnstile-container', {
          sitekey: siteKey,
          theme,
          callback: (token: string) => onVerify(token),
        })
      } else {
        setTimeout(checkTurnstile, 200)
      }
    }

    setTimeout(checkTurnstile, 500)
  }, [])

  return <div id="cf-turnstile-container" className="flex justify-center my-4" />
}
