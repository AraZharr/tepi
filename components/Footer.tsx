import Link from 'next/link'
import { getDB } from '@/lib/db'

export default async function Footer({ locale }: { locale?: string }) {
  let settings: Record<string, string> = {}
  try {
    const db = await getDB()
    const rows = await db.prepare('SELECT * FROM site_settings').all()
    for (const s of (rows.results ?? []) as Record<string, unknown>[]) {
      settings[s.key as string] = (s.value as string) || ''
    }
  } catch { /* fail silent — fallback defaults */ }

  return (
    <footer className="border-t border-border bg-surface dark:border-border-dark dark:bg-surface-dark">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="font-heading text-lg font-extrabold text-text-primary dark:text-text-primary-dark">tepi.my.id</Link>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">{settings.site_description || 'Free subdomain for developers Indonesia'}</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Layanan</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={`/${locale || 'id'}/blog`} className="text-text-secondary hover:text-text-primary transition">Blog & Testimoni</Link></li>
              <li><Link href={`/${locale || 'id'}/pricing`} className="text-text-secondary hover:text-text-primary transition">Harga</Link></li>
              <li><Link href={`/${locale || 'id'}/contact`} className="text-text-secondary hover:text-text-primary transition">Kontak</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Ikuti Kami</h4>
            <ul className="space-y-2 text-sm">
              {settings.social_github && <li><a href={settings.social_github} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary transition">GitHub</a></li>}
              {settings.social_instagram && <li><a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary transition">Instagram</a></li>}
              {settings.social_twitter && <li><a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary transition">Twitter / X</a></li>}
              {settings.social_tiktok && <li><a href={settings.social_tiktok} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary transition">TikTok</a></li>}
              {!settings.social_github && !settings.social_instagram && !settings.social_twitter && !settings.social_tiktok && (
                <li className="text-text-muted">Coming soon</li>
              )}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Kontak</h4>
            <ul className="space-y-2 text-sm">
              {settings.wa_number && <li><a href={`https://wa.me/${settings.wa_number}`} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary transition">WhatsApp</a></li>}
              {settings.social_email && <li><a href={`mailto:${settings.social_email}`} className="text-text-secondary hover:text-text-primary transition">{settings.social_email}</a></li>}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-text-muted dark:border-border-dark">
          {settings.footer_text || '© 2025 tepi.my.id — Free subdomain for developers Indonesia'}
        </div>
      </div>
    </footer>
  )
}
