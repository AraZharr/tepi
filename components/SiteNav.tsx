import Link from 'next/link'

export default function SiteNav() {
  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-sm dark:border-border-dark dark:bg-surface-dark/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-heading shrink-0 text-base font-extrabold text-text-primary dark:text-text-primary-dark sm:text-xl"
        >
          tepi.my.id
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          <Link href="/blog" className="text-sm font-medium text-text-secondary transition hover:text-text-primary">
            Blog
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-text-secondary transition hover:text-text-primary">
            Harga
          </Link>
          <Link href="/billing" className="text-sm font-medium text-text-secondary transition hover:text-text-primary">
            Tagihan
          </Link>
          <Link href="/contact" className="text-sm font-medium text-text-secondary transition hover:text-text-primary">
            Kontak
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text-primary transition hover:bg-surface-2 dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-2-dark"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-blue px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-hover dark:bg-blue-dark"
          >
            Daftar
          </Link>
        </div>

        {/* Mobile — only auth CTAs, no overflow */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <Link
            href="/login"
            className="px-2 py-1.5 text-xs font-semibold text-text-primary dark:text-text-primary-dark"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-blue px-3 py-1.5 text-xs font-semibold text-white"
          >
            Daftar
          </Link>
        </div>
      </div>
    </nav>
  )
}
