import type { Metadata } from 'next'
import { Poppins, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeInitializer } from '@/components/ThemeInitializer'
import '../globals.css'

// Font sesuai design.md §3 — HANYA dua font ini yang boleh dipakai di seluruh app
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'tepi.my.id — Free Subdomain for Indonesia',
    template: '%s | tepi.my.id',
  },
  description:
    'Dapatkan subdomain .tepi.my.id gratis untuk project kamu. GitHub Pages, Vercel, Cloudflare Pages, VPS — semua didukung.',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Validasi locale — redirect ke 404 kalau tidak dikenal
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  // Aktifkan static rendering untuk locale ini
  setRequestLocale(locale)

  // Muat pesan terjemahan untuk locale saat ini
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable}`}>
      <head>
        <ThemeInitializer />
      </head>
      <body className="font-body">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
