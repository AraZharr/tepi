import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HomePageContent />
}

function HomePageContent() {
  const t = useTranslations('HomePage')

  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 dark:border-border-dark dark:bg-surface-dark">
        <Link href="/" className="font-heading text-xl font-extrabold text-text-primary dark:text-text-primary-dark">
          tepi.my.id
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2 dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-2-dark"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-hover dark:bg-blue-dark dark:hover:bg-blue-hover-dark"
          >
            Daftar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="font-heading text-4xl font-extrabold text-text-primary dark:text-text-primary-dark md:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-[520px] text-lg text-text-secondary dark:text-text-secondary-dark">
          {t('description')}
        </p>

        <div className="mt-8 flex gap-4">
          <Link
            href="/register"
            className="rounded-md bg-blue px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-hover hover:shadow-blue dark:bg-blue-dark dark:hover:bg-blue-hover-dark"
          >
            Daftar Sekarang
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border bg-transparent px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-dark"
          >
            Sudah punya akun
          </Link>
        </div>

        <p className="mt-12 rounded-md border border-border bg-surface px-6 py-3 text-sm text-text-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-muted-dark">
          🚧 {t('wip')}
        </p>
      </section>
    </main>
  )
}
