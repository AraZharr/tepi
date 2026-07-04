import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HomePageContent />
}

function HomePageContent() {
  const t = useTranslations('HomePage')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-8 text-center dark:bg-bg-dark">
      <h1 className="font-heading text-4xl font-extrabold text-text-primary dark:text-text-primary-dark">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-[480px] text-lg text-text-secondary dark:text-text-secondary-dark">
        {t('description')}
      </p>
      <p className="mt-12 rounded-md border border-border bg-surface px-6 py-3 text-sm text-text-muted dark:border-border-dark dark:bg-surface-dark dark:text-text-muted-dark">
        🚧 {t('wip')}
      </p>
    </main>
  )
}
