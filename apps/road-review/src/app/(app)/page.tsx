import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: '公道レビュー' },
}

/** "/" home. Placeholder until stage 13 (search box, type chips, top favorites). */
export default function HomePage() {
  return (
    <section aria-labelledby="home-heading" className="mx-auto max-w-md">
      <h1 id="home-heading" className="heading-mincho text-2xl text-ink">
        道をさがす
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        検索とお気に入りの画面を準備しています。
      </p>
    </section>
  )
}
