import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HomePageContent locale={locale} />
}

function HomePageContent({ locale }: { locale: string }) {
  const t = useTranslations('HomePage')

  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-border bg-surface/80 backdrop-blur-sm px-6 py-4 dark:border-border-dark dark:bg-surface-dark/80">
        <Link href="/" className="font-heading text-xl font-extrabold text-text-primary dark:text-text-primary-dark">
          tepi.my.id
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/blog" className="text-sm font-medium text-text-secondary hover:text-text-primary transition">Blog</Link>
          <Link href="/pricing" className="text-sm font-medium text-text-secondary hover:text-text-primary transition">Harga</Link>
          <Link href="/contact" className="text-sm font-medium text-text-secondary hover:text-text-primary transition">Kontak</Link>
          <Link href="/login" className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2 dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-2-dark">Masuk</Link>
          <Link href="/register" className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-hover dark:bg-blue-dark dark:hover:bg-blue-hover-dark">Daftar</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Dot grid bg */}
        <div className="absolute inset-0 dot-grid-bg pointer-events-none" />
        <div className="relative">
          <div className="inline-block rounded-full bg-blue-subtle dark:bg-blue-subtle-dark px-4 py-1.5 text-xs font-semibold text-blue dark:text-blue-dark mb-6">
            🚀 FREE — Untuk Developer Indonesia
          </div>
          <h1 className="font-heading text-4xl font-extrabold text-text-primary dark:text-text-primary-dark md:text-5xl lg:text-6xl leading-tight">
            Domain Gratis <br/>
            <span className="text-blue dark:text-blue-dark">.tepi.my.id</span>
          </h1>
          <p className="mt-4 max-w-[520px] mx-auto text-lg text-text-secondary dark:text-text-secondary-dark">
            {t('description')}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register"
              className="rounded-md bg-blue px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-hover hover:shadow-blue dark:bg-blue-dark dark:hover:bg-blue-hover-dark">
              Daftar Sekarang — Gratis
            </Link>
            <Link href="/login"
              className="rounded-md border border-border bg-transparent px-8 py-3.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-dark">
              Sudah punya akun
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-center">
            <div><p className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark">3 Bulan</p><p className="text-xs text-text-muted">Masa aktif free</p></div>
            <div><p className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark">Rp5K</p><p className="text-xs text-text-muted">Paid / tahun</p></div>
            <div><p className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark">24 Jam</p><p className="text-xs text-text-muted">Review approval</p></div>
            <div><p className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark">CDN</p><p className="text-xs text-text-muted">Cloudflare proxy</p></div>
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="border-t border-border bg-surface px-6 py-16 dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-8">Gabung dengan Platform Favoritmu</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {['GitHub Pages', 'Vercel', 'Cloudflare Pages', 'VPS', 'Netlify', 'Railway'].map((p) => (
              <div key={p} className="rounded-lg border border-border bg-bg px-5 py-3 text-sm font-semibold dark:border-border-dark dark:bg-surface-dark">{p}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark text-center mb-8">Kenapa tepi.my.id?</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: '⚡', title: 'Auto DNS', desc: 'DNS record dibuat otomatis via Cloudflare API begitu disetujui. Gak perlu config manual.' },
              { icon: '🛡️', title: 'CDN + Proxy', desc: 'Semua subdomain dilindungi Cloudflare CDN — DDoS protection, SSL otomatis, cache.' },
              { icon: '💸', title: 'Gratis 3 Bulan', desc: 'Coba dulu gratis 3 bulan. Kalo suka, bisa extend 1 tahun cuma Rp5.000.' },
              { icon: '📋', title: 'Review 24 Jam', desc: 'Admin review dalam 1×24 jam. Transparan — kalo ditolak, ada alasan jelas.' },
              { icon: '🔄', title: 'Auto Renewal', desc: 'Free renewal otomatis selama target masih pointing ke subdomain kamu.' },
              { icon: '🇮🇩', title: 'Made in Indonesia', desc: 'Dibuat oleh developer Indonesia, untuk developer Indonesia. Ada tim yang bisa lo chat.' },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-border bg-bg p-5 transition hover:shadow-md dark:border-border-dark dark:bg-surface-dark">
                <p className="text-2xl mb-2">{f.icon}</p>
                <h3 className="font-heading font-bold text-text-primary dark:text-text-primary-dark">{f.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-surface px-6 py-16 text-center dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-heading text-2xl font-bold text-text-primary dark:text-text-primary-dark mb-4">Siap Mulai?</h2>
          <p className="text-text-secondary mb-6">Daftar gratis, klaim subdomain kamu dalam hitungan menit.</p>
          <Link href="/register"
            className="inline-block rounded-md bg-blue px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-hover hover:shadow-blue dark:bg-blue-dark dark:hover:bg-blue-hover-dark">
            🚀 Daftar Sekarang
          </Link>
        </div>
      </section>
    </main>
  )
}
