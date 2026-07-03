import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // Daftar locale yang didukung
  locales: ['id', 'en'],

  // Bahasa default — tampil tanpa prefix (/dashboard bukan /id/dashboard)
  defaultLocale: 'id',

  // 'as-needed': /id/... tidak ada, cukup /...
  // Bahasa non-default pakai prefix: /en/dashboard
  localePrefix: 'as-needed',
})
