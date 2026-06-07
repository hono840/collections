import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchTemplate } from '@/components/templates/SearchTemplate'
import { SearchResults } from '@/components/organisms/SearchResults'
import { searchCars, getFacets } from '@/features/search/data'
import { parseSearchParams, type SearchParamsInput } from '@/lib/validations/search'

export const metadata: Metadata = {
  title: '車種を探す',
  description:
    'メーカー・ボディタイプ・キーワードで車種を絞り込む。ショーケース車種だけの表示も可能。',
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function Results({ params }: { params: ReturnType<typeof parseSearchParams> }) {
  const { models, total } = await searchCars(params)
  return <SearchResults models={models} total={total} />
}

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = (await searchParams) as SearchParamsInput
  const params = parseSearchParams(raw)
  const facets = await getFacets()

  return (
    <SearchTemplate facets={facets} params={params}>
      <Suspense fallback={<p className="text-sm text-ck-text-muted">検索中…</p>}>
        <Results params={params} />
      </Suspense>
    </SearchTemplate>
  )
}
