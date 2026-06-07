import type { CarModel, CarModelSummary } from '@/types/car'
import { seedModels } from '@/lib/seed'

/**
 * クライアント/サーバ双方で使える車種サマリー（seed は純データのため client 安全）。
 * Supabase 移行後は軽量な一覧キャッシュに差し替える。
 */
export function toSummary(model: CarModel): CarModelSummary {
  return {
    id: model.id,
    manufacturerNameJa: model.manufacturer.nameJa,
    manufacturerSlug: model.manufacturer.id,
    nameJa: model.nameJa,
    nameEn: model.nameEn,
    slug: model.slug,
    bodyType: model.bodyType,
    originCountry: model.originCountry,
    yearFrom: model.yearFrom,
    yearTo: model.yearTo,
    depthLevel: model.depthLevel,
    completeness: model.completeness,
  }
}

export const allSummaries: CarModelSummary[] = seedModels.map(toSummary)

export function summaryByRef(ref: string): CarModelSummary | undefined {
  return allSummaries.find(
    (s) => `${s.manufacturerSlug}:${s.slug}` === ref
  )
}
