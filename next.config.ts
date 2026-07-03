import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  // Cloudflare Pages tidak support image optimization bawaan Next.js
  images: {
    unoptimized: true,
  },
}

export default withNextIntl(nextConfig)
