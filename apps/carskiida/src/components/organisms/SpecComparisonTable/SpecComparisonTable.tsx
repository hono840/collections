import { cn } from '@/lib/utils/cn'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import { SpecLabel } from '@/components/molecules/SpecLabel'
import { computeSpecDiff, type CompareColumn } from '@/features/compare/diff'

export interface SpecComparisonTableProps {
  columns: CompareColumn[]
  className?: string
}

/**
 * 比較表（organism）。列=対象車 / 行=諸元。
 * 差分は「色 + 記号(▲最大/▼最小) + 太字」の3点併用で色覚に依存しない。
 * 欠損は「—」で明示し差分計算から除外する。
 */
export function SpecComparisonTable({
  columns,
  className,
}: SpecComparisonTableProps) {
  if (columns.length < 2) {
    return (
      <p className={cn('text-sm text-ck-text-muted', className)}>
        比較するには 2 台以上を選択してください。
      </p>
    )
  }

  const rows = computeSpecDiff(columns)

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">諸元比較表</caption>
        <thead>
          <tr className="border-b-2 border-ck-border-strong">
            <th
              scope="col"
              className="ck-num sticky left-0 z-10 bg-ck-bg px-3 py-2 text-left text-xs uppercase tracking-wide text-ck-text-muted"
            >
              項目 / SPEC
            </th>
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="min-w-40 rounded-t-md border-x border-ck-border bg-ck-primary px-3 py-2 text-right text-ck-bg"
              >
                <span className="block text-sm">{c.title}</span>
                {c.subtitle && (
                  <span className="ck-num block text-xs text-ck-bg/70">
                    {c.subtitle}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              className={cn(
                'border-b border-ck-border',
                i % 2 === 1 && 'bg-ck-surface-sunken/50'
              )}
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left font-normal text-ck-text-muted"
              >
                <SpecLabel specKey={row.key} />
              </th>
              {row.cells.map((cell, ci) => {
                if (!cell.spec) {
                  return (
                    <td
                      key={ci}
                      className="border-x border-ck-border px-3 py-2 text-right text-ck-text-muted"
                      title="データなし"
                    >
                      —
                    </td>
                  )
                }
                const isMax = cell.highlight === 'max'
                const isMin = cell.highlight === 'min'
                return (
                  <td
                    key={ci}
                    className={cn(
                      'border-x border-ck-border px-3 py-2 text-right align-baseline',
                      isMax && 'bg-ck-positive/10',
                      isMin && 'bg-ck-mark/10'
                    )}
                  >
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {isMax && (
                        <span className="ck-num text-xs text-ck-positive" aria-label="最大">
                          ▲
                        </span>
                      )}
                      {isMin && (
                        <span className="ck-num text-xs text-ck-mark" aria-label="最小">
                          ▼
                        </span>
                      )}
                      <span
                        className={cn(
                          'ck-num text-ck-text',
                          (isMax || isMin) && 'font-semibold'
                        )}
                      >
                        {cell.spec.valueDisplay}
                      </span>
                      <SourceBadge source={cell.spec.source} />
                    </span>
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
