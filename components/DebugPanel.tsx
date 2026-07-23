'use client'

import { useState, useEffect } from 'react'

export default function DebugPanel() {
  const [logs, setLogs] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Intercept console.error
    const originalError = console.error
    console.error = (...args: any[]) => {
      originalError(...args)
      setLogs((prev) => [...prev.slice(-9), { type: 'error', msg: args, time: new Date().toLocaleTimeString() }])
    }

    // Intercept fetch errors via global error handler
    window.addEventListener('unhandledrejection', (e) => {
      setLogs((prev) => [...prev.slice(-9), { type: 'reject', msg: [e.reason?.message || e.reason], time: new Date().toLocaleTimeString() }])
    })

    return () => {
      console.error = originalError
    }
  }, [])

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
        <div className="w-80 max-h-96 overflow-auto rounded-lg border border-red bg-black/95 p-3 shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between mb-2 border-b border-red/30 pb-2">
            <span className="font-bold text-red">🐛 Debug Log</span>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-red">✕</button>
          </div>
          {logs.length === 0 ? (
            <p className="text-gray-400">No errors yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="border-l-2 border-red pl-2 py-1">
                  <div className="text-gray-400 text-[10px]">{log.time}</div>
                  <div className="text-white break-words">
                    {log.msg.map((m: any, j: number) => (
                      <div key={j}>
                        {typeof m === 'object' ? JSON.stringify(m, null, 2) : String(m)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                const text = logs.map(l => `${l.time} ${l.msg.map(m => typeof m === 'object' ? JSON.stringify(m) : String(m)).join(' ')}`).join('\n')
                navigator.clipboard.writeText(text)
              }}
              className="flex-1 rounded bg-blue/20 py-1 text-blue hover:bg-blue/30 text-xs"
            >
              Copy
            </button>
            <button
              onClick={() => setLogs([])}
              className="flex-1 rounded bg-red/20 py-1 text-red hover:bg-red/30 text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
