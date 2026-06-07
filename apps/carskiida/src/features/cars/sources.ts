import type { CarModel, Source } from '@/types/car'

/**
 * 1 車種が参照する全フィールドの出典を集約し、重複を除いて返す。
 * 詳細ページ末尾の「出典一覧」(AC-SRC-04) で使う。
 */
export function collectModelSources(model: CarModel): Source[] {
  const seen = new Map<string, Source>()

  const add = (s?: Source) => {
    if (!s) return
    const key = `${s.type}|${s.label}|${s.url ?? ''}`
    if (!seen.has(key)) seen.set(key, s)
  }

  const addFieldSources = (fs?: Record<string, Source>) => {
    if (!fs) return
    for (const s of Object.values(fs)) add(s)
  }

  addFieldSources(model.fieldSources)
  addFieldSources(model.manufacturer.fieldSources)

  for (const gen of model.generations) {
    addFieldSources(gen.fieldSources)
    for (const p of gen.production) add(p.source)
    for (const grade of gen.grades) {
      addFieldSources(grade.fieldSources)
      for (const sv of grade.specs) add(sv.source)
      for (const part of grade.parts) add(part.source)
    }
  }

  return Array.from(seen.values())
}
