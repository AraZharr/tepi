'use client'

import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // hooks must run before early return
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md bg-bg dark:bg-bg-dark rounded-xl shadow-xl border border-border dark:border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
          <h3 className="font-semibold text-text-primary dark:text-text-primary-dark">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface transition-colors text-text-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
