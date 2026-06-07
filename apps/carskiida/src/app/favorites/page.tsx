'use client'

import Link from 'next/link'
import { CarCard } from '@/components/molecules/CarCard'
import { useFavorites } from '@/features/favorites/store'
import { summaryByRef } from '@/features/cars/summaries'

export default function FavoritesPage() {
  const favorites = useFavorites()
  const models = favorites
    .map((ref) => summaryByRef(ref))
    .filter((m): m is NonNullable<typeof m> => m != null)

  return (
    <div className="ck-blueprint relative min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 py-10 pb-28 sm:px-6 sm:py-16">
        <nav className="mb-6">
          <Link
            href="/"
            className="ck-num text-xs uppercase tracking-wide text-ck-text-muted transition-colors hover:text-ck-accent"
          >
            ← carskiida 図鑑
          </Link>
        </nav>

        <header className="mb-8 border-b-2 border-ck-border-strong pb-4">
          <p className="ck-num text-xs uppercase tracking-widest text-ck-text-muted">
            Favorites
          </p>
          <h1
            className="mt-1 text-3xl text-ck-text sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            お気に入り
          </h1>
        </header>

        {models.length === 0 ? (
          <div className="rounded-md border border-dashed border-ck-border bg-ck-surface px-5 py-10 text-center">
            <p className="text-base text-ck-text">
              お気に入りはまだありません。
            </p>
            <p className="mt-2 text-sm text-ck-text-muted">
              各車種カードや詳細ページの「☆ 保存」で追加できます。
            </p>
            <Link
              href="/search"
              className="ck-num mt-4 inline-block rounded-sm border-2 border-ck-accent px-3 py-1.5 text-xs uppercase tracking-wide text-ck-accent transition-colors hover:bg-ck-accent/10"
            >
              車種を探す →
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <li key={m.id}>
                <CarCard model={m} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
