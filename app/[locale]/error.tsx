'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg dark:bg-bg-dark">
      <div className="text-center px-4">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">Terjadi Kesalahan</h1>
        <p className="text-text-secondary mb-6">Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.</p>
        <button
          onClick={reset}
          className="rounded-md bg-blue px-6 py-2 text-sm font-semibold text-white hover:bg-blue-hover transition"
        >
          Coba Lagi
        </button>
      </div>
    </main>
  )
}
