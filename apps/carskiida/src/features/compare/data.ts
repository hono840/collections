import type { CarModel, Generation, Grade, SpecKey, SpecValue } from '@/types/car'
import { getCarDetail } from '@/features/cars/data'
import type { CompareColumn } from './diff'

export const MAX_COMPARE = 4

export interface CompareRef {
  manufacturer: string
  model: string
  genId?: string
  gradeId?: string
}

/**
 * 比較対象 ids をパースする。
 * 形式: "manufacturer:model" / "manufacturer:model:genId" / "manufacturer:model:genId:gradeId"
 * カンマ区切りで複数。重複は除去し、最大 MAX_COMPARE 件に丸める。
 */
export function parseCompareIds(idsParam: string | undefined | null): CompareRef[] {
  if (!idsParam) return []
  const seen = new Set<string>()
  const refs: CompareRef[] = []
  for (const raw of idsParam.split(',')) {
    const token = raw.trim()
    if (!token || seen.has(token)) continue
    const [manufacturer, model, genId, gradeId] = token.split(':')
    if (!manufacturer || !model) continue
    seen.add(token)
    refs.push({ manufacturer, model, genId, gradeId })
    if (refs.length >= MAX_COMPARE) break
  }
  return refs
}

/** depth モデルの既定世代（最新＝先頭）と既定グレード（その先頭） */
function resolveGradeAndGen(
  model: CarModel,
  ref: CompareRef
): { gen?: Generation; grade?: Grade } {
  if (model.generations.length === 0) return {}
  const gen =
    (ref.genId && model.generations.find((g) => g.id === ref.genId)) ||
    model.generations[0]
  const grade =
    (ref.gradeId && gen.grades.find((gr) => gr.id === ref.gradeId)) ||
    gen.grades[0]
  return { gen, grade }
}

function specMapOf(grade?: Grade): Map<SpecKey, SpecValue> {
  if (!grade) return new Map()
  return new Map(grade.specs.map((s) => [s.key, s]))
}

/** 比較対象 ref から比較列を構築する（解決できない ref はスキップ） */
export async function buildCompareColumns(
  refs: CompareRef[]
): Promise<CompareColumn[]> {
  const columns: CompareColumn[] = []
  for (const ref of refs) {
    const model = await getCarDetail(ref.manufacturer, ref.model)
    if (!model) continue
    const { gen, grade } = resolveGradeAndGen(model, ref)
    const titleParts = [model.manufacturer.nameJa, model.nameJa]
    const subParts = [gen?.code ?? gen?.nameJa, grade?.name].filter(Boolean)
    columns.push({
      id: [ref.manufacturer, ref.model, gen?.id, grade?.id]
        .filter(Boolean)
        .join(':'),
      title: titleParts.join(' '),
      subtitle: subParts.length > 0 ? subParts.join(' / ') : undefined,
      specs: specMapOf(grade),
    })
  }
  return columns
}
