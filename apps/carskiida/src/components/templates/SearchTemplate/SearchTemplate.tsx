import Link from 'next/link'
import { FilterSidebar } from '@/components/organisms/FilterSidebar'
import type { Facets } from '@/features/search/data'
import type { ParsedSearchParams } from '@/lib/validations/search'

export interface SearchTemplateProps {
  facets: Facets
  params: ParsedSearchParams
  children: React.ReactNode
}

/**
 * 検索テンプレート。外枠（ヘッダ＋フィルタ）は静的、結果は children として流し込む。
 */
export function SearchTemplate({ facets, params, children }: SearchTemplateProps) {
  return (
    <div className="ck-blueprint relative min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
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
            Search
          </p>
          <h1
            className="mt-1 text-3xl text-ck-text sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            車種を探す
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside>
            <FilterSidebar facets={facets} params={params} />
          </aside>
          <section>{children}</section>
        </div>
      </div>
    </div>
  )
}
