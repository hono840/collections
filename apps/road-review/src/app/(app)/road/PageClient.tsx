'use client'

import { useSearchParams } from 'next/navigation'

/** Placeholder until stage 14 (route map, trace, favorite toggle). */
export function RoadPageClient() {
  const searchParams = useSearchParams()
  const hasRoadKey = Boolean(searchParams.get('id'))

  return (
    <section aria-labelledby="road-heading" className="mx-auto max-w-md">
      <h1 id="road-heading" className="heading-mincho text-2xl text-ink">
        道の詳細
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        {hasRoadKey ? '道の詳細の画面を準備しています。' : '道が指定されていません。'}
      </p>
    </section>
  )
}
