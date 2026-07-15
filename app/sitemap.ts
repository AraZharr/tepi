import { MetadataRoute } from 'next'
import { getDB } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://tepi.my.id'

  let blogUrls: MetadataRoute.Sitemap = []
  try {
    const db = await getDB()
    const posts = await db.prepare('SELECT slug, published_at FROM posts WHERE is_published = 1').all()
    for (const p of (posts.results ?? []) as Record<string, unknown>[]) {
      blogUrls.push({
        url: `${base}/blog/${p.slug as string}`,
        lastModified: new Date(p.published_at as string),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })
    }
  } catch { /* no blog yet */ }

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/report`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/en`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/en/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/en/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/en/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...blogUrls,
  ]
}
