import { cn } from '@/lib/utils/cn'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import { SpecLabel } from '@/components/molecules/SpecLabel'
import { SPEC_ORDER } from '@/lib/constants/specs'
import type { Grade, SpecKey, SpecValue } from '@/types/car'

export interface GradeSpecPanelProps {
  grades: Grade[]
  className?: string
}

function specMap(grade: Grade): Map<SpecKey, SpecValue> {
  return new Map(grade.specs.map((s) => [s.key, s]))
}

/**
 * グレード別 諸元パネル（organism）。
 * 行 = 諸元項目 / 列 = グレード。各値に出典バッジを添える。
 * 欠損は「—」で明示する。
 */
export function GradeSpecPanel({ grades, className }: GradeSpecPanelProps) {
  const maps = grades.map((g) => ({ grade: g, map: specMap(g) }))

  // いずれかのグレードに存在する諸元キーのみ、定義順で表示
  const rows = SPEC_ORDER.filter((key) =>
    maps.some(({ map }) => map.has(key))
  )

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">グレード別諸元表</caption>
        <thead>
          <tr className="border-b-2 border-ck-border-strong">
            <th
              scope="col"
              className="ck-num px-3 py-2 text-left text-xs uppercase tracking-wide text-ck-text-muted"
            >
              項目 / SPEC
            </th>
            {maps.map(({ grade }) => (
              <th
                key={grade.id}
                scope="col"
                className="px-3 py-2 text-right text-sm text-ck-text"
              >
                {grade.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((key, i) => (
            <tr
              key={key}
              className={cn(
                'border-b border-ck-border',
                i % 2 === 1 && 'bg-ck-surface-sunken/50'
              )}
            >
              <th
                scope="row"
                className="px-3 py-2 text-left font-normal text-ck-text-muted"
              >
                <SpecLabel specKey={key} />
              </th>
              {maps.map(({ grade, map }) => {
                const sv = map.get(key)
                return (
                  <td key={grade.id} className="px-3 py-2 text-right align-baseline">
                    {sv ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="ck-num text-ck-text">
                          {sv.valueDisplay}
                        </span>
                        <SourceBadge source={sv.source} />
                      </span>
                    ) : (
                      <span className="text-ck-text-muted" title="データなし">
                        —
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
