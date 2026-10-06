import { RatingMeter } from '@/components/atoms/RatingMeter'
import { RATING_AXIS_LABELS, TRAFFIC_LABELS } from '@/lib/constants/labels'
import { formatAverage, type DriveRatingSummary, type RatingAggregate } from '@/lib/ratings/summary'
import { TRAFFIC_LEVELS } from '@/lib/validation/drive'
import type { RatingAxis } from '@/types/drive'
import { cn } from '@/lib/utils/cn'

export type RatingSummaryProps = {
  /** summarizeDrives() result. */
  summary: DriveRatingSummary
  className?: string
}

const AXES: readonly RatingAxis[] = ['overall', 'scenery', 'roadSurface', 'easeOfDriving']

function AverageText({ aggregate }: { aggregate: RatingAggregate }) {
  if (aggregate.average === null) return <span className="num font-bold text-ink-muted">—</span>
  return (
    <span>
      <span className="num font-bold text-ink">{formatAverage(aggregate.average)}</span>
      <span className="text-sm text-ink-muted">（{aggregate.count}件の平均）</span>
    </span>
  )
}

/**
 * "評価のまとめ" on the road detail (PRD US-08; UX S-06). Averages with their record count, one decimal.
 * 交通量 is a situation, so it is shown as counts and never averaged.
 */
export function RatingSummary({ summary, className }: RatingSummaryProps) {
  const trafficText = TRAFFIC_LEVELS.map((level) => `${TRAFFIC_LABELS[level]} ${summary.traffic[level]}`).join('・')

  return (
    <ul
      aria-label="評価のまとめ"
      className={cn('divide-y divide-line rounded-md border border-line bg-surface-raised px-4', className)}
    >
      {AXES.map((axis) => {
        const aggregate = summary[axis]
        return (
          <li key={axis} className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <span className="text-sm text-ink-muted">{RATING_AXIS_LABELS[axis]} </span>
            <span className="flex items-center gap-3">
              <AverageText aggregate={aggregate} />
              {axis === 'overall' && aggregate.average !== null ? (
                <RatingMeter
                  value={aggregate.average}
                  label={`総合評価 平均${formatAverage(aggregate.average)}`}
                  size="md"
                />
              ) : null}
            </span>
          </li>
        )
      })}
      <li className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <span className="text-sm text-ink-muted">交通量 </span>
        <span className="num text-sm font-bold text-ink">{trafficText}</span>
      </li>
    </ul>
  )
}
