import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '道の一覧',
}

// Sprint 1 placeholder. Sprint 2 builds the list + map (S-05).
export default function RoadsPage() {
  return (
    <section aria-labelledby="roads-heading">
      <h1 id="roads-heading" className="heading-mincho text-2xl text-ink">
        道の一覧
      </h1>
      <p className="mt-4 text-ink-muted">道の一覧と登録は準備中です。</p>
    </section>
  )
}
