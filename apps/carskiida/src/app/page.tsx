import Link from 'next/link'
import { CarCard } from '@/components/molecules/CarCard'
import { listCarSummaries } from '@/features/cars/data'

export default async function HomePage() {
  const cars = await listCarSummaries()
  const showcaseCount = cars.filter((c) => c.depthLevel === 'showcase').length

  return (
    <div className="ck-blueprint relative min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-10 border-b-2 border-ck-border-strong pb-6">
          <p className="ck-num text-xs uppercase tracking-widest text-ck-text-muted">
            Automotive Encyclopedia
          </p>
          <h1
            className="mt-2 text-5xl text-ck-text sm:text-6xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            carskiida
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ck-text-muted">
            車種を「世代史 × パーツ構造 × 生産地」で立体的に引ける、日本語の自動車百科事典。
            在庫や価格ではなく、車そのものの中身を深く知るための図鑑です。
          </p>
          <p className="ck-num mt-4 text-xs uppercase tracking-wide text-ck-text-muted">
            {cars.length} models / {showcaseCount} showcase
          </p>
          <nav className="ck-num mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-wide">
            <Link
              href="/search"
              className="rounded-sm border border-ck-border px-3 py-1.5 text-ck-text transition-colors hover:border-ck-accent hover:text-ck-accent"
            >
              車種を探す →
            </Link>
            <Link
              href="/glossary"
              className="rounded-sm border border-ck-border px-3 py-1.5 text-ck-text transition-colors hover:border-ck-accent hover:text-ck-accent"
            >
              用語集 →
            </Link>
            <Link
              href="/favorites"
              className="rounded-sm border border-ck-border px-3 py-1.5 text-ck-text transition-colors hover:border-ck-accent hover:text-ck-accent"
            >
              お気に入り →
            </Link>
          </nav>
        </header>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => (
            <li key={car.id}>
              <CarCard model={car} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
