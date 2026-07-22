import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HomePageContent locale={locale} />
}

function HomePageContent({ locale }: { locale: string }) {
  const t = useTranslations('HomePage')

  return (
    <main className="flex min-h-screen flex-col">
      <SiteNav />

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-20">
        <div className="pointer-events-none absolute inset-0 dot-grid-bg" />
        <div className="relative w-full max-w-3xl">
          <div className="mb-6 inline-block rounded-full bg-blue-subtle px-3 py-1.5 text-[11px] font-semibold text-blue dark:bg-blue-subtle-dark dark:text-blue-dark sm:px-4 sm:text-xs">
            🚀 FREE — Untuk Developer Indonesia
          </div>
          <h1 className="font-heading text-3xl font-extrabold leading-tight text-text-primary dark:text-text-primary-dark sm:text-4xl md:text-5xl lg:text-6xl">
            Domain Gratis <br />
            <span className="text-blue dark:text-blue-dark">.tepi.my.id</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[520px] text-base text-text-secondary dark:text-text-secondary-dark sm:text-lg">
            {t('description')}
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              href="/register"
              className="rounded-md bg-blue px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-hover hover:shadow-blue dark:bg-blue-dark dark:hover:bg-blue-hover-dark sm:px-8 sm:py-3.5"
            >
              Daftar Sekarang — Gratis
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border bg-transparent px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-dark sm:px-8 sm:py-3.5"
            >
              Sudah punya akun
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-6 text-center sm:flex sm:flex-wrap sm:justify-center sm:gap-8">
            <div>
              <p className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark sm:text-2xl">3 Bulan</p>
              <p className="text-xs text-text-muted">Masa aktif free</p>
            </div>
            <div>
              <p className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark sm:text-2xl">Rp5K</p>
              <p className="text-xs text-text-muted">Paid / tahun</p>
            </div>
            <div>
              <p className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark sm:text-2xl">24 Jam</p>
              <p className="text-xs text-text-muted">Review approval</p>
            </div>
            <div>
              <p className="font-heading text-xl font-bold text-text-primary dark:text-text-primary-dark sm:text-2xl">CDN</p>
              <p className="text-xs text-text-muted">Cloudflare proxy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="border-t border-border bg-surface px-4 py-12 dark:border-border-dark dark:bg-surface-dark sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading mb-8 text-xl font-bold text-text-primary dark:text-text-primary-dark sm:text-2xl">
            Gabung dengan Platform Favoritmu
          </h2>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6">
            {['GitHub Pages', 'Vercel', 'Cloudflare Pages', 'VPS', 'Netlify', 'Railway'].map((p) => (
              <div
                key={p}
                className="rounded-lg border border-border bg-bg px-4 py-2.5 text-xs font-semibold dark:border-border-dark dark:bg-surface-dark sm:px-5 sm:py-3 sm:text-sm"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-heading mb-8 text-center text-xl font-bold text-text-primary dark:text-text-primary-dark sm:text-2xl">
            Kenapa tepi.my.id?
          </h2>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: '⚡', title: 'Auto DNS', desc: 'DNS record dibuat otomatis via Cloudflare API begitu disetujui. Gak perlu config manual.' },
              { icon: '🛡️', title: 'CDN + Proxy', desc: 'Semua subdomain dilindungi Cloudflare CDN — DDoS protection, SSL otomatis, cache.' },
              { icon: '💸', title: 'Gratis 3 Bulan', desc: 'Coba dulu gratis 3 bulan. Kalo suka, bisa extend 1 tahun cuma Rp5.000.' },
              { icon: '📋', title: 'Review 24 Jam', desc: 'Admin review dalam 1×24 jam. Transparan — kalo ditolak, ada alasan jelas.' },
              { icon: '🔄', title: 'Auto Renewal', desc: 'Free renewal otomatis selama target masih pointing ke subdomain kamu.' },
              { icon: '🇮🇩', title: 'Made in Indonesia', desc: 'Dibuat oleh developer Indonesia, untuk developer Indonesia. Ada tim yang bisa lo chat.' },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-bg p-4 transition hover:shadow-md dark:border-border-dark dark:bg-surface-dark sm:p-5"
              >
                <p className="mb-2 text-2xl">{f.icon}</p>
                <h3 className="font-heading font-bold text-text-primary dark:text-text-primary-dark">{f.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-surface px-4 py-12 text-center dark:border-border-dark dark:bg-surface-dark sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-heading mb-4 text-xl font-bold text-text-primary dark:text-text-primary-dark sm:text-2xl">
            Siap Mulai?
          </h2>
          <p className="mb-6 text-text-secondary">Daftar gratis, klaim subdomain kamu dalam hitungan menit.</p>
          <Link
            href="/register"
            className="inline-block rounded-md bg-blue px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-hover hover:shadow-blue dark:bg-blue-dark dark:hover:bg-blue-hover-dark sm:px-8 sm:py-3.5"
          >
            🚀 Daftar Sekarang
          </Link>
        </div>
      </section>
    </main>
  )
}
