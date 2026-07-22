import type { Metadata } from 'next'
import { Poppins, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeInitializer } from '@/components/ThemeInitializer'
import Footer from '@/components/Footer'
import '../globals.css'
import ChatWidget from '@/components/ChatWidget'
import DebugPanel from '@/components/DebugPanel'

// Footer + auth pages hit D1 via getCloudflareContext — must not prerender static
export const dynamic = 'force-dynamic'

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
  openGraph: {
    title: 'tepi.my.id — Free Subdomain for Indonesia',
    description: 'Dapatkan subdomain .tepi.my.id gratis untuk project kamu.',
    type: 'website',
    siteName: 'tepi.my.id',
  },
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

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable}`}>
      <head>
        <ThemeInitializer />
      </head>
      <body className="font-body">
        <NextIntlClientProvider messages={messages}>
          {children}
          <Footer locale={locale} />
          <ChatWidget />
          <DebugPanel />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
