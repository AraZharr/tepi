import Link from 'next/link'
import { setRequestLocale } from 'next-intl/server'

export const metadata = {
  title: 'Harga | tepi.my.id',
  description: 'Free subdomain .tepi.my.id — gratis 3 bulan. Upgrade Rp5.000/tahun untuk domain unlimited, bebas iklan, dan prioritas.',
  openGraph: {
    title: 'Harga | tepi.my.id',
    description: 'Free subdomain .tepi.my.id — gratis 3 bulan. Upgrade Rp5.000/tahun.',
  },
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const tiers = [
    {
      name: 'Free',
      price: 'Rp0',
      period: '3 bulan',
      desc: 'Coba dulu — gratis',
      features: [
        '1 subdomain .tepi.my.id',
        'Masa aktif 3 bulan',
        'Cloudflare CDN + SSL',
        'Auto DNS record',
        'Renewal otomatis (klik tombol)',
        'Iklan Adsterra',
        'Support via WA/Email',
      ],
      cta: 'Daftar Gratis',
      href: '/register',
      featured: false,
    },
    {
      name: 'Paid',
      price: 'Rp5.000',
      period: 'per tahun',
      desc: 'Untuk yang serius',
      features: [
        'Hingga 5 subdomain',
        'Masa aktif 1 tahun',
        'Cloudflare CDN + SSL',
        'Auto DNS record',
        'QRIS auto-renewal',
        '✅ BEBAS IKLAN',
        'Support prioritas',
      ],
      cta: 'Upgrade Sekarang',
      href: '/register',
      featured: true,
    },
  ]

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="border-b border-border bg-surface px-6 py-4 dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-heading text-xl font-extrabold text-text-primary dark:text-text-primary-dark">tepi.my.id</Link>
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">← Beranda</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="font-heading text-3xl font-extrabold text-text-primary dark:text-text-primary-dark mb-2">Pilih Paket</h1>
        <p className="text-text-secondary dark:text-text-secondary-dark mb-10">Mulai gratis, upgrade kapan aja.</p>

        <div className="grid gap-6 md:grid-cols-2 md:mx-auto md:max-w-2xl">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-xl border p-6 text-left transition hover:shadow-lg ${
                tier.featured
                  ? 'border-blue bg-blue-subtle dark:border-blue-dark dark:bg-blue-subtle-dark'
                  : 'border-border bg-bg dark:border-border-dark dark:bg-surface-dark'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue px-4 py-0.5 text-xs font-semibold text-white">POPULER</div>
              )}
              <h2 className="font-heading text-2xl font-extrabold text-text-primary dark:text-text-primary-dark">{tier.name}</h2>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-text-primary dark:text-text-primary-dark">{tier.price}</span>
                <span className="text-sm text-text-muted"> /{tier.period}</span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">{tier.desc}</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-text-primary dark:text-text-primary-dark">
                    <span className="mt-0.5 shrink-0">{f.includes('BEBAS') || f.startsWith('Hingga') ? '✅' : '✓'}</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-6 block w-full rounded-md py-3 text-center text-sm font-semibold transition ${
                  tier.featured
                    ? 'bg-blue text-white hover:bg-blue-hover'
                    : 'border border-border text-text-primary hover:bg-surface dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-dark'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div className="mt-12 text-left">
          <h3 className="font-heading text-xl font-bold text-center mb-6">Perbandingan Lengkap</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-6 font-semibold text-text-primary">Fitur</th>
                  <th className="pb-3 pr-6 text-center font-semibold text-text-primary">Free</th>
                  <th className="pb-3 text-center font-semibold text-blue">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  ['Max subdomain', '2', '5'],
                  ['Masa aktif', '3 bulan', '1 tahun'],
                  ['Renewal', 'Otomatis (cek pointing)', 'QRIS'],
                  ['Iklan Adsterra', 'Ada', '❌ Bebas Iklan'],
                  ['Cloudflare CDN', '✅', '✅'],
                  ['Auto DNS', '✅', '✅'],
                  ['Support', 'WA / Email', 'Prioritas'],
                ].map(([feature, free, paid]) => (
                  <tr key={feature}>
                    <td className="py-3 pr-6 font-medium text-text-primary">{feature}</td>
                    <td className="py-3 pr-6 text-center text-text-secondary">{free}</td>
                    <td className="py-3 text-center font-semibold text-blue">{paid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
