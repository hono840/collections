'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/atoms/Button'

type AppErrorProps = {
  error: Error & { digest?: string }
  /** Re-fetches and re-renders the segment (Next.js 16.3). */
  retry: () => void
}

/**
 * Error boundary for the app area (R-1). The header stays in place
 * (the (app) layout is outside this boundary). error.message is never shown:
 * it may carry internal details. The app is a static export, so this only
 * catches errors thrown while rendering in the browser.
 */
export default function AppError({ error, retry }: AppErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section aria-labelledby="load-error-heading" className="mx-auto max-w-md py-8 text-center">
      <h1 id="load-error-heading" className="text-lg font-bold text-ink">
        読み込めませんでした
      </h1>
      <p className="mt-2 text-base text-ink-muted">もう一度お試しください。</p>
      <Button className="mt-6 w-full md:w-auto" onClick={() => retry()}>
        もう一度読み込む
      </Button>
    </section>
  )
}
