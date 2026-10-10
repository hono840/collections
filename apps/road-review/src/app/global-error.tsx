'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import './globals.css'

type GlobalErrorProps = {
  error: Error & { digest?: string }
  /** Re-fetches and re-renders the root (Next.js 16.3). */
  retry: () => void
}

/**
 * Replaces the root layout when it fails (R-1), so it renders its own
 * <html>/<body>. Light-only like the root layout (C-09). error.message is never shown.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ja">
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <title>読み込めませんでした | 公道レビュー</title>
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12 text-center">
          <h1 className="text-lg font-bold text-ink">読み込めませんでした</h1>
          <p className="mt-2 text-base text-ink-muted">もう一度お試しください。</p>
          <Button className="mt-6 w-full" onClick={() => retry()}>
            もう一度読み込む
          </Button>
        </main>
      </body>
    </html>
  )
}
