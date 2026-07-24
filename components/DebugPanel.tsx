'use client'

import { useState, useEffect, useCallback } from 'react'

type LogEntry = {
  type: 'error' | 'api' | 'reject' | 'info'
  msg: string[]
  time: string
}

function serialize(m: unknown): string {
  if (m == null) return String(m)
  if (typeof m === 'string') return m
  if (m instanceof Error) return m.message + (m.stack ? '\n' + m.stack.split('\n').slice(0, 3).join('\n') : '')
  try {
    return JSON.stringify(m, null, 2)
  } catch {
    return String(m)
  }
}

export default function DebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const push = useCallback((type: LogEntry['type'], ...args: unknown[]) => {
    setLogs((prev) => [
      ...prev.slice(-29),
      { type, msg: args.map(serialize), time: new Date().toLocaleTimeString() },
    ])
  }, [])

  useEffect(() => {
    const originalError = console.error
    console.error = (...args: any[]) => {
      originalError(...args)
      push('error', ...args)
    }

    const onReject = (e: PromiseRejectionEvent) => {
      push('reject', e.reason?.message || e.reason)
    }
    window.addEventListener('unhandledrejection', onReject)

    // Intercept fetch → log non-OK API responses (full body)
    const origFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const method = (init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') || 'GET').toUpperCase()
      try {
        const res = await origFetch(input, init)
        if (!res.ok && (url.includes('/api/') || url.includes('tepi.my.id'))) {
          let body = ''
          try {
            body = await res.clone().text()
          } catch {
            body = '(body unreadable)'
          }
          push('api', `${method} ${url}`, `status ${res.status}`, body.slice(0, 1500))
        }
        return res
      } catch (err) {
        push('api', `${method} ${url}`, 'network fail', err)
        throw err
      }
    }

    return () => {
      console.error = originalError
      window.removeEventListener('unhandledrejection', onReject)
      window.fetch = origFetch
    }
  }, [push])

  const copyAll = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.type}] ${l.msg.join(' | ')}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-red text-white shadow-lg hover:bg-red/90"
          title="Debug Logs"
        >
          🐛
          {logs.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-black">
              {logs.length}
            </span>
          )}
        </button>
      ) : (
        <div className="w-[min(92vw,24rem)] max-h-[70vh] overflow-auto rounded-lg border border-red bg-black/95 p-3 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between mb-2 border-b border-red/30 pb-2 sticky top-0 bg-black/95">
            <span className="font-bold text-red">🐛 Debug Log ({logs.length})</span>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-red">✕</button>
          </div>
          {logs.length === 0 ? (
            <p className="text-gray-400">No errors yet. API 4xx/5xx + console.error masuk sini.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`border-l-2 pl-2 py-1 ${
                    log.type === 'api' ? 'border-yellow-500' : log.type === 'info' ? 'border-blue' : 'border-red'
                  }`}
                >
                  <div className="text-gray-400 text-[10px]">
                    {log.time} · {log.type}
                  </div>
                  <div className="text-white break-all whitespace-pre-wrap">
                    {log.msg.map((m, j) => (
                      <div key={j}>{m}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-3 sticky bottom-0 bg-black/95 pt-2">
            <button onClick={copyAll} className="flex-1 rounded bg-blue/20 py-1 text-blue hover:bg-blue/30 text-xs">
              Copy
            </button>
            <button onClick={() => setLogs([])} className="flex-1 rounded bg-red/20 py-1 text-red hover:bg-red/30 text-xs">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
