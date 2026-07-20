import { getDB } from '@/lib/db'
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const db = await getDB()
  const post = await db.prepare('SELECT title, excerpt, cover_image FROM posts WHERE slug = ? AND is_published = 1').bind(slug).first() as any

  if (!post) return { title: 'Not Found | tepi.my.id' }

  return {
    title: `${post.title} | tepi.my.id`,
    description: post.excerpt || `Baca artikel ${post.title} di tepi.my.id`,
    openGraph: {
      title: post.title,
      description: post.excerpt || `Baca artikel ${post.title} di tepi.my.id`,
      type: 'article',
      ...(post.cover_image ? { images: [{ url: post.cover_image }] } : {}),
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const db = await getDB()
  const post = await db.prepare('SELECT * FROM posts WHERE slug = ? AND is_published = 1').bind(slug).first() as Record<string, unknown> | null

  if (!post) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-text-primary mb-4">Artikel Tidak Ditemukan</h1>
          <Link href={`/${locale}/blog`} className="text-blue hover:underline">← Kembali ke Blog</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg dark:bg-bg-dark">
      <nav className="border-b border-border bg-surface px-6 py-4 dark:border-border-dark dark:bg-surface-dark">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-heading text-xl font-extrabold text-text-primary dark:text-text-primary-dark">tepi.my.id</Link>
          <Link href={`/${locale}/blog`} className="text-sm text-text-secondary hover:text-text-primary">← Blog</Link>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-4 py-12">
        {!!post.cover_image && (
          <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg bg-surface-2 dark:bg-surface-2-dark">
            <img src={post.cover_image as string} alt={post.title as string} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mb-2 flex items-center gap-3 text-sm text-text-muted">
          {!!post.tags && <span className="text-xs font-semibold uppercase tracking-wider text-blue">{(post.tags as string).split(',')[0]}</span>}
          <span>{post.author_name as string}</span>
          <span>·</span>
          <span>{post.published_at as string}</span>
        </div>

        <h1 className="font-heading text-3xl font-extrabold text-text-primary dark:text-text-primary-dark md:text-4xl">{post.title as string}</h1>

        {!!post.excerpt && <p className="mt-4 text-lg text-text-secondary dark:text-text-secondary-dark">{post.excerpt as string}</p>}

        <div
          className="mt-8 prose prose-sm md:prose-base dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content as string }}
        />

        <div className="mt-12 border-t border-border pt-6 text-center dark:border-border-dark">
          <p className="text-sm text-text-muted mb-4">Tertarik punya subdomain gratis? 🚀</p>
          <Link
            href="/register"
            className="inline-block rounded-md bg-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-hover"
          >
            Daftar Sekarang
          </Link>
        </div>
      </article>
    </main>
  )
}
