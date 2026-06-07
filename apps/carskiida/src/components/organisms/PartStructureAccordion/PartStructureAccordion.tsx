import { cn } from '@/lib/utils/cn'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import { PART_CATEGORY_LABELS, PART_CATEGORY_ORDER } from '@/lib/constants/specs'
import type { Grade, Part, PartCategoryKey } from '@/types/car'

export interface PartStructureAccordionProps {
  grades: Grade[]
  className?: string
}

interface AggregatedPart {
  key: string
  part: Part
  /** このパーツを搭載するグレード名 */
  grades: string[]
}

/** グレード横断でパーツを集約し、カテゴリ別に整理する */
export function aggregateParts(
  grades: Grade[]
): Map<PartCategoryKey, AggregatedPart[]> {
  const byCategory = new Map<PartCategoryKey, Map<string, AggregatedPart>>()

  for (const grade of grades) {
    for (const part of grade.parts) {
      const catMap =
        byCategory.get(part.category) ?? new Map<string, AggregatedPart>()
      const key = `${part.nameJa}__${part.specSummary ?? ''}`
      const existing = catMap.get(key)
      if (existing) {
        existing.grades.push(grade.name)
      } else {
        catMap.set(key, { key, part, grades: [grade.name] })
      }
      byCategory.set(part.category, catMap)
    }
  }

  const result = new Map<PartCategoryKey, AggregatedPart[]>()
  for (const cat of PART_CATEGORY_ORDER) {
    const catMap = byCategory.get(cat)
    if (catMap && catMap.size > 0) {
      result.set(cat, Array.from(catMap.values()))
    }
  }
  return result
}

/**
 * パーツ構造ビュー（organism）— カテゴリ別アコーディオン（ネイティブ details/summary）。
 * グレード横断でパーツを集約し、各パーツに出典を添える。
 */
export function PartStructureAccordion({
  grades,
  className,
}: PartStructureAccordionProps) {
  const grouped = aggregateParts(grades)
  const showGradeAvailability = grades.length > 1
  const categories = Array.from(grouped.entries())

  if (categories.length === 0) {
    return (
      <p className={cn('text-sm text-ck-text-muted', className)}>
        パーツ構造データは収録準備中です。
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {categories.map(([category, parts], idx) => (
        <details
          key={category}
          open={idx === 0}
          className="group rounded-md border border-ck-border bg-ck-surface"
        >
          <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 marker:content-none">
            <span className="ck-num text-xs text-ck-text-muted">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span className="text-base text-ck-text">
              {PART_CATEGORY_LABELS[category]}
            </span>
            <span className="ck-num ml-auto text-xs text-ck-text-muted">
              {parts.length}
            </span>
          </summary>
          <ul className="border-t border-ck-border px-4 py-2">
            {parts.map(({ key, part, grades: partGrades }) => (
              <li
                key={key}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ck-border py-2 last:border-b-0"
              >
                <span className="text-sm text-ck-text">{part.nameJa}</span>
                {part.specSummary && (
                  <span className="text-xs text-ck-text-muted">
                    {part.specSummary}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  {showGradeAvailability && (
                    <span className="ck-num text-xs text-ck-text-muted">
                      {partGrades.join(' / ')}
                    </span>
                  )}
                  <SourceBadge source={part.source} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
