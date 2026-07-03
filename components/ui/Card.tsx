import { HTMLAttributes } from 'react'

/**
 * Card sesuai design.md §7.
 * accentRed: menambah border-left 2px merah — SATU-SATUNYA konteks di mana
 * merah dipakai di kartu (mis. menandai subdomain berstatus aktif).
 * Jangan pakai accentRed di banyak kartu sekaligus — lihat design.md §2
 * soal aturan "merah tipis, numpang lewat".
 */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentRed?: boolean
  hover?: boolean
}

export function Card({ accentRed = false, hover = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-border bg-bg p-6 shadow-md transition-all duration-200 ease-in-out',
        'dark:border-border-dark dark:bg-surface-dark',
        hover ? 'hover:-translate-y-0.5 hover:shadow-lg' : '',
        accentRed ? 'border-l-2 border-l-red' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
