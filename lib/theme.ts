/**
 * Auto dark/light mode berdasarkan waktu lokal user.
 * Lihat design.md §8 untuk spesifikasi lengkap.
 *
 * Prioritas:
 * 1. Preferensi tersimpan di localStorage → dipakai
 * 2. Tidak ada preferensi → hitung dari waktu lokal user (bukan hardcode UTC+7)
 * 3. Toggle manual selalu override dan disimpan
 */

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'tepi-theme'

/** Hitung tema berdasarkan jam saat ini di timezone lokal browser user */
export function getThemeByTime(): Theme {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  })
  const hour = parseInt(formatter.format(now), 10)

  // Light: 04:00–15:59, Dark: 16:00–03:59 (di waktu lokal user)
  return hour >= 4 && hour < 16 ? 'light' : 'dark'
}

/** Ambil tema yang seharusnya aktif — preferensi tersimpan, atau fallback ke waktu */
export function resolveTheme(): Theme {
  if (typeof window === 'undefined') return 'light' // SSR fallback

  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved

  return getThemeByTime()
}

/** Terapkan tema ke <html> dan simpan sebagai preferensi manual */
export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(STORAGE_KEY, theme)
}

/** Terapkan tema tanpa menyimpan preferensi (dipakai saat auto-detect awal) */
export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/** Hapus preferensi manual — kembali mengikuti waktu lokal otomatis */
export function clearThemeOverride() {
  localStorage.removeItem(STORAGE_KEY)
  applyTheme(getThemeByTime())
}
