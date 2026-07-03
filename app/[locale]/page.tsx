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

// Komponen terpisah agar useTranslations bisa dipanggil di Client Component jika perlu
function HomePageContent() {
  const t = useTranslations('HomePage')

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center',
        background: '#f9f9f9',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>
        {t('title')}
      </h1>
      <p style={{ fontSize: '1.125rem', color: '#555', maxWidth: '480px' }}>
        {t('description')}
      </p>
      <p
        style={{
          marginTop: '3rem',
          fontSize: '0.875rem',
          color: '#aaa',
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
        }}
      >
        🚧 {t('wip')}
      </p>
    </main>
  )
}
