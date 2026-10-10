import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RoadPageClient } from './PageClient'

export const metadata: Metadata = {
  title: '道の詳細',
}

/**
 * "/road/?id={roadKey}" (ARCH v3 6). The id is read in the browser with useSearchParams,
 * so the client part sits in a Suspense boundary and the rest is prerendered.
 */
export default function RoadPage() {
  return (
    <Suspense fallback={<RoadPageFallback />}>
      <RoadPageClient />
    </Suspense>
  )
}

function RoadPageFallback() {
  return (
    <section aria-labelledby="road-heading" className="mx-auto max-w-md">
      <h1 id="road-heading" className="heading-mincho text-2xl text-ink">
        道の詳細
      </h1>
      <p className="mt-3 text-base text-ink-muted">読み込み中…</p>
    </section>
  )
}
