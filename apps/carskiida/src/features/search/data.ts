import type { BodyType, CarModelSummary } from '@/types/car'
import { listCarSummaries } from '@/features/cars/data'
import type { ParsedSearchParams } from '@/lib/validations/search'

/**
 * 検索・絞り込み（現状はシード上でのインメモリ実装）。
 * Sprint 3 以降、Supabase の PGroonga 全文検索（RPC search_cars）に差し替える。
 * 戻り値の形（CarModelSummary[]）を固定しておき、UI を変えずに置換できるようにする。
 */

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFKC')
}

function matchesQuery(model: CarModelSummary, q: string, aliases: string[]): boolean {
  if (!q) return true
  const needle = normalize(q)
  const haystack = normalize(
    [model.nameJa, model.nameEn, model.manufacturerNameJa, ...aliases].join(' ')
  )
  return haystack.includes(needle)
}

export interface SearchResult {
  models: CarModelSummary[]
  total: number
}

export interface FacetCount {
  value: string
  label: string
  count: number
}

export interface Facets {
  makers: FacetCount[]
  bodyTypes: FacetCount[]
  countries: FacetCount[]
}

// alias は summary に含めないため、検索用に元データから引く軽量マップ
import { seedModels } from '@/lib/seed'
const aliasMap = new Map(
  seedModels.map((m) => [
    `${m.manufacturer.id}:${m.slug}`,
    m.aliases ?? [],
  ])
)

export async function searchCars(
  params: ParsedSearchParams
): Promise<SearchResult> {
  const all = await listCarSummaries()

  let results = all.filter((m) => {
    if (params.showcaseOnly && m.depthLevel !== 'showcase') return false
    if (params.maker.length > 0 && !params.maker.includes(m.manufacturerSlug))
      return false
    if (params.body.length > 0 && !params.body.includes(m.bodyType)) return false
    if (params.country.length > 0 && !params.country.includes(m.originCountry))
      return false
    const aliases = aliasMap.get(`${m.manufacturerSlug}:${m.slug}`) ?? []
    if (!matchesQuery(m, params.q, aliases)) return false
    return true
  })

  results = sortResults(results, params.sort)

  return { models: results, total: results.length }
}

function sortResults(
  models: CarModelSummary[],
  sort: ParsedSearchParams['sort']
): CarModelSummary[] {
  const copy = [...models]
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.nameJa.localeCompare(b.nameJa, 'ja'))
    case 'maker':
      return copy.sort(
        (a, b) =>
          a.manufacturerNameJa.localeCompare(b.manufacturerNameJa, 'ja') ||
          a.nameJa.localeCompare(b.nameJa, 'ja')
      )
    case 'relevance':
    default:
      // showcase（充実度高）を優先し、次に充足度降順
      return copy.sort(
        (a, b) =>
          Number(b.depthLevel === 'showcase') -
            Number(a.depthLevel === 'showcase') ||
          b.completeness - a.completeness
      )
  }
}

const BODY_LABELS_FOR_FACET: Record<string, string> = {
  sedan: 'セダン', hatchback: 'ハッチバック', coupe: 'クーペ', wagon: 'ワゴン',
  suv: 'SUV', minivan: 'ミニバン', kei: '軽自動車', convertible: 'オープン',
  pickup: 'ピックアップ', other: 'その他',
}

/** ファセット候補（全件ベースのカウント） */
export async function getFacets(): Promise<Facets> {
  const all = await listCarSummaries()

  const makerCounts = new Map<string, FacetCount>()
  const bodyCounts = new Map<string, FacetCount>()
  const countryCounts = new Map<string, FacetCount>()

  for (const m of all) {
    const mk = makerCounts.get(m.manufacturerSlug)
    if (mk) mk.count++
    else
      makerCounts.set(m.manufacturerSlug, {
        value: m.manufacturerSlug,
        label: m.manufacturerNameJa,
        count: 1,
      })

    const bt = bodyCounts.get(m.bodyType)
    if (bt) bt.count++
    else
      bodyCounts.set(m.bodyType, {
        value: m.bodyType,
        label: BODY_LABELS_FOR_FACET[m.bodyType] ?? m.bodyType,
        count: 1,
      })

    const ct = countryCounts.get(m.originCountry)
    if (ct) ct.count++
    else
      countryCounts.set(m.originCountry, {
        value: m.originCountry,
        label: m.originCountry,
        count: 1,
      })
  }

  return {
    makers: Array.from(makerCounts.values()).sort((a, b) => b.count - a.count),
    bodyTypes: Array.from(bodyCounts.values()).sort((a, b) => b.count - a.count),
    countries: Array.from(countryCounts.values()).sort((a, b) => b.count - a.count),
  }
}
