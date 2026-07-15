'use client'

import { useState, useRef, useEffect } from 'react'

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '6281234567890'
const EMAIL_ADDR = process.env.NEXT_PUBLIC_EMAIL_ADDR || 'hello@tepi.my.id'

function buildWAText(messages: { role: string; content: string }[]) {
  const lines = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const label = m.role === 'user' ? 'Saya' : 'Tepi CS'
      return `${label}: ${m.content}`
    })
  return encodeURIComponent(
    `Halo tim tepi.my.id, saya butuh bantuan lebih lanjut.\n\nRiwayat chat:\n${lines.join('\n')}`
  )
}

function buildEmailBody(messages: { role: string; content: string }[]) {
  const lines = messages
    .filter((m) => m.role !== 'system')
    .map((m) => {
      const label = m.role === 'user' ? 'Saya' : 'Tepi CS'
      return `${label}: ${m.content}`
    })
  return encodeURIComponent(
    `Halo tim tepi.my.id,\n\nSaya butuh bantuan lebih lanjut.\n\nRiwayat chat:\n${lines.join('\n')}\n\n--\nDikirim via chatbot tepi.my.id`
  )
}

const QUICK_REPLIES = [
  'Cara klaim subdomain?',
  'Berapa harganya?',
  'Beda free dan paid?',
]

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h10v10" /><path d="M7 17 21 3" />
    </svg>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Halo! Saya Tepi CS, asisten AI tepi.my.id. Ada yang bisa saya bantu soal subdomain gratis? 🚀',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return

    const userMsg = { role: 'user' as const, content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.ok
            ? data.reply
            : data.error || 'Gagal memproses. Silakan hubungi via WhatsApp.',
        },
      ])
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Koneksi error. Silakan hubungi via WhatsApp.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Bubble */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-[52px] h-[52px] rounded-full bg-blue text-white flex items-center justify-center shadow-blue hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label={open ? 'Tutup chat' : 'Buka chat'}
      >
        {open ? <XIcon /> : <ChatIcon />}
      </button>

      {/* Card */}
      {open && (
        <div
          className="fixed bottom-[72px] right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] bg-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl shadow-lg flex flex-col overflow-hidden"
          style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue text-white flex items-center justify-center text-sm font-bold">
                  T
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark leading-tight">
                    Tepi CS
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Online &middot; Biasanya membalas sebentar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${buildWAText(messages)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium text-green-600 hover:text-green-700 flex items-center gap-0.5 transition dark:text-green-400 dark:hover:text-green-300"
                >
                  WA
                  <ExternalIcon />
                </a>
                <a
                  href={`mailto:${EMAIL_ADDR}?subject=Bantuan%20tepi.my.id&body=${buildEmailBody(messages)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium text-blue hover:text-blue-hover flex items-center gap-0.5 transition dark:text-blue-dark dark:hover:text-blue-hover-dark"
                >
                  Email
                  <ExternalIcon />
                </a>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[360px] min-h-[200px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue text-white rounded-2xl rounded-br-md'
                      : 'bg-surface dark:bg-surface-2-dark text-text-primary dark:text-text-primary-dark rounded-2xl rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface dark:bg-surface-2-dark px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => send(qr)}
                  className="text-[11px] font-medium text-text-secondary bg-surface dark:bg-surface-2-dark hover:bg-surface-2 dark:hover:bg-surface-dark border border-border dark:border-border-dark rounded-full px-3 py-1.5 transition"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-border dark:border-border-dark">
            <div className="flex items-center gap-2 bg-surface dark:bg-surface-dark rounded-xl px-3 py-2 border border-border dark:border-border-dark focus-within:border-blue transition">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan..."
                disabled={loading}
                className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-text-muted disabled:opacity-50 text-text-primary dark:text-text-primary-dark"
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="text-text-muted hover:text-blue transition disabled:opacity-30"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
