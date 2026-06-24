import type { CarModel, CarModelSummary } from '@/types/car'
import { seedModels } from '@/lib/seed'
import { allSummaries, toSummary } from './summaries'

/**
 * 車種データアクセス層。
 *
 * 現状はインメモリのシードを参照する（Sprint 1 縦切り）。
 * Sprint 3 以降、Supabase（`'use cache'` + `cacheTag('car-{id}')`）へ差し替える。
 * インターフェース（戻り値の形）を固定しておくことで、置き換え時に UI を変えずに済む。
 */

/** 1 車種の詳細を取得（manufacturer slug + model slug）。見つからなければ null */
export async function getCarDetail(
  manufacturerSlug: string,
  modelSlug: string
): Promise<CarModel | null> {
  const model = seedModels.find(
    (m) => m.manufacturer.id === manufacturerSlug && m.slug === modelSlug
  )
  return model ?? null
}

/** 静的生成対象（depth=showcase のみ事前生成） */
export async function getShowcaseParams(): Promise<
  { manufacturer: string; model: string }[]
> {
  return seedModels
    .filter((m) => m.depthLevel === 'showcase')
    .map((m) => ({ manufacturer: m.manufacturer.id, model: m.slug }))
}

/** 全車種のサマリー一覧（breadth + depth） */
export async function listCarSummaries(): Promise<CarModelSummary[]> {
  return allSummaries
}

/** 全車種の (manufacturer, model) パラメータ（sitemap 用） */
export async function getAllCarParams(): Promise<
  { manufacturer: string; model: string }[]
> {
  return seedModels.map((m) => ({ manufacturer: m.manufacturer.id, model: m.slug }))
}

/**
 * 関連車回遊。同ボディタイプ → 同メーカー の順で関連度を付け、自身を除外して返す。
 * 価格は扱わないため、クラス・メーカー・ボディで関連付ける。
 */
export async function getRelatedCars(
  model: CarModel,
  limit = 4
): Promise<CarModelSummary[]> {
  const selfRef = `${model.manufacturer.id}:${model.slug}`
  const others = allSummaries.filter(
    (s) => `${s.manufacturerSlug}:${s.slug}` !== selfRef
  )

  const scored = others
    .map((s) => {
      let score = 0
      if (s.bodyType === model.bodyType) score += 2
      if (s.manufacturerSlug === model.manufacturer.id) score += 1
      if (s.depthLevel === 'showcase') score += 0.5
      return { s, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length >= limit) {
    return scored.slice(0, limit).map((x) => x.s)
  }

  // 強い一致が足りない場合は充足度の高い他車で補完し、回遊を切らさない
  const picked = scored.map((x) => x.s)
  const pickedRefs = new Set(picked.map((s) => `${s.manufacturerSlug}:${s.slug}`))
  const fallback = [...others]
    .filter((s) => !pickedRefs.has(`${s.manufacturerSlug}:${s.slug}`))
    .sort(
      (a, b) =>
        Number(b.depthLevel === 'showcase') - Number(a.depthLevel === 'showcase') ||
        b.completeness - a.completeness
    )
  return [...picked, ...fallback].slice(0, limit)
}

export { toSummary }
