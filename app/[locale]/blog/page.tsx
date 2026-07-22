import { getDB } from '@/lib/db'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import SiteNav from '@/components/SiteNav'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Blog & Testimoni | tepi.my.id',
  description: 'Baca kisah sukses pengguna tepi.my.id — subdomain gratis untuk developer Indonesia.',
  openGraph: { title: 'Blog & Testimoni | tepi.my.id', description: 'Baca kisah sukses pengguna subdomain gratis tepi.my.id.' },
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const db = await getDB()
  const posts = await db.prepare(
    `SELECT slug, title, excerpt, cover_image, author_name, tags, is_featured, published_at
     FROM posts WHERE is_published = 1
     ORDER BY is_featured DESC, published_at DESC`
  ).all()
  const list = (posts.results ?? []) as Record<string, unknown>[]

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <SiteNav />

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-heading text-3xl font-extrabold text-text-primary dark:text-text-primary-dark mb-2">Blog & Testimoni</h1>
        <p className="text-text-secondary dark:text-text-secondary-dark mb-8">Kisah sukses, tips, dan update dari tepi.my.id</p>

        {list.length === 0 ? (
          <Card hover={false} className="p-12 text-center text-text-muted">Belum ada artikel. Nantikan testimoni pertama kami! 🚀</Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {list.map((post: any) => (
              <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className="group block">
                <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                  {!!post.cover_image && (
                    <div className="aspect-video w-full overflow-hidden bg-surface-2 dark:bg-surface-2-dark">
                      <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-5">
                    {!!post.tags && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue">{post.tags}</p>}
                    <h2 className="font-heading text-lg font-bold text-text-primary dark:text-text-primary-dark group-hover:text-blue transition-colors">{post.title}</h2>
                    {!!post.excerpt && <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark line-clamp-2">{post.excerpt}</p>}
                    <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
                      <span>{post.author_name}</span>
                      <span>·</span>
                      <span>{post.published_at}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
