/**
 * SemaphoreLegend — good / caution / danger key with the current thresholds and a link to change
 * them (design-spec §6.1 / §8.3). Presentational content block: the dashboard shows it inside a
 * Sheet popover; Settings renders it inline. Each row is StatusDot (shape + colour + label) so it is
 * never colour-only. Meaning is fixed: green = 良好 (low rate) … red = 危険 (high rate).
 */
import type { AlertStatus } from '@/lib/domain'
import { formatPercent1 } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { StatusDot } from '@/components/atoms/StatusDot'

export interface SemaphoreLegendProps {
  warn: number
  danger: number
  /** Navigate to the threshold settings. */
  onEditThresholds?: () => void
  className?: string
}

export function SemaphoreLegend({ warn, danger, onEditThresholds, className }: SemaphoreLegendProps) {
  const rows: Array<{ status: AlertStatus; range: string }> = [
    { status: 'good', range: `${formatPercent1(warn)} 未満` },
    { status: 'caution', range: `${formatPercent1(warn)} 〜 ${formatPercent1(danger)}` },
    { status: 'danger', range: `${formatPercent1(danger)} 超` },
  ]
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <ul className="flex flex-col gap-2">
        {rows.map(({ status, range }) => (
          <li key={status} className="flex items-center justify-between gap-3">
            <StatusDot status={status} showLabel />
            <span className="text-body-sm font-num tabular-nums text-ink-secondary">{range}</span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-ink-muted">原価率は低いほど良好です。閾値は設定で変更できます。</p>
      {onEditThresholds && (
        <button
          type="button"
          onClick={onEditThresholds}
          className="text-label self-start text-primary-ink underline"
        >
          閾値を変更
        </button>
      )}
    </div>
  )
}
