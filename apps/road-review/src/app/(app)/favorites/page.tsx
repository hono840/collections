import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'お気に入り',
}

/** "/favorites/". Placeholder until stage 15. */
export default function FavoritesPage() {
  return (
    <section aria-labelledby="favorites-heading" className="mx-auto max-w-md">
      <h1 id="favorites-heading" className="heading-mincho text-2xl text-ink">
        お気に入り
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">お気に入りの一覧を準備しています。</p>
    </section>
  )
}
