'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/atoms/Button'

type SignedInErrorProps = {
  error: Error & { digest?: string }
  /** Re-fetches and re-renders the segment (Next.js 16.3). */
  retry: () => void
}

/**
 * Error boundary for the signed-in area (R-1). The header stays in place
 * (the (app) layout is outside this boundary). error.message is never shown:
 * it may carry server details in development and is generic in production.
 */
export default function SignedInError({ error, retry }: SignedInErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section aria-labelledby="load-error-heading" className="mx-auto max-w-md py-8 text-center">
      <h1 id="load-error-heading" className="text-lg font-bold text-ink">
        読み込めませんでした
      </h1>
      <p className="mt-2 text-base text-ink-muted">通信状態を確かめて、もう一度お試しください。</p>
      <Button className="mt-6 w-full md:w-auto" onClick={() => retry()}>
        もう一度読み込む
      </Button>
    </section>
  )
}
