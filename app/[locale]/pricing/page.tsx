import Link from 'next/link'
import { setRequestLocale } from 'next-intl/server'
import SiteNav from '@/components/SiteNav'

const BASE_PRICE = 5000
const NS_ADDON_PRICE = 1000
const TOTAL_PRICE = BASE_PRICE + NS_ADDON_PRICE

export const metadata = {
  title: 'Harga | tepi.my.id',
  description: 'Free subdomain .tepi.my.id — gratis 3 bulan. Upgrade Rp5.000/tahun untuk domain unlimited, bebas iklan, dan prioritas. Add-on NS: +Rp1.000.',
  openGraph: {
    title: 'Harga | tepi.my.id',
    description: 'Free subdomain .tepi.my.id — gratis 3 bulan. Upgrade Rp5.000/tahun. Add-on NS: +Rp1.000.',
  },
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const tiers = [
    {
      name: 'Free',
      price: 0,
      period: '/ 3 bulan',
      features: [
        '2 subdomain',
        'Masa aktif 3 bulan',
        'Auto renewal (cek pointing)',
        'Cloudflare CDN & Auto DNS',
        'Support WA / Email',
      ],
      cta: 'Daftar Gratis',
      href: '/register',
    },
    {
      name: 'Paid',
      price: BASE_PRICE,
      period: '/ tahun',
      features: [
        '5 subdomain',
        'Masa aktif 1 tahun',
        'Renewal QRIS',
        '❌ Bebas Iklan Adsterra',
        'Cloudflare CDN & Auto DNS',
        'Support Prioritas WA / Email',
        'Add-on NS Record: +Rp1.000',
      ],
      cta: 'Upgrade Sekarang',
      href: '/register',
      featured: true,
    },
  ]

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <SiteNav />

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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue px-4 py-0.5 text-xs font-semibold text-white">
                  POPULER
                </div>
              )}
              <h2 className="font-heading text-2xl font-extrabold text-text-primary dark:text-text-primary-dark">
                {tier.name}
              </h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-text-primary dark:text-text-primary-dark">
                  Rp{tier.price.toLocaleString()}
                </span>
                <span className="text-text-secondary dark:text-text-secondary-dark">{tier.period}</span>
              </div>
              {tier.featured && (
                <p className="mt-1 text-xs text-blue dark:text-blue-light">
                  Base: Rp{BASE_PRICE.toLocaleString()} + NS Add-on: Rp{NS_ADDON_PRICE.toLocaleString()} = Rp{TOTAL_PRICE.toLocaleString()}
                </p>
              )}
              <ul className="mt-6 space-y-3">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-secondary dark:text-text-secondary-dark">
                    <span className="flex-shrink-0 mt-0.5 text-blue">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-6 block w-full rounded-lg py-3 text-center font-semibold transition ${
                  tier.featured
                    ? 'bg-blue text-white hover:bg-blue/90'
                    : 'bg-surface text-text-primary border border-border hover:bg-surface/80 dark:bg-surface-dark dark:text-text-primary-dark dark:border-border-dark'
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
                  ['NS Add-on (4 records)', '❌', `+Rp${NS_ADDON_PRICE.toLocaleString()}`],
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