import { meterFillCount } from '@/lib/ratings/summary'
import { cn } from '@/lib/utils/cn'

export type RatingMeterSize = 'sm' | 'md'

export type RatingMeterProps = {
  /** Displayed value (an integer for one drive, a one-decimal average for a road). null renders nothing. */
  value: number | null
  /** Accessible name composed by the caller, e.g. "総合評価 平均4.3". The number is also shown as text nearby. */
  label: string
  size?: RatingMeterSize
  className?: string
}

const CELL_COUNT = 5

// spec 4-2 "表示だけの場合": card 12x6px / gap 2px, detail 20x8px / gap 3px, radius-xs.
const sizeClasses: Record<RatingMeterSize, { row: string; cell: string }> = {
  sm: { row: 'gap-0.5', cell: 'h-1.5 w-3' },
  md: { row: 'gap-0.75', cell: 'h-2 w-5' },
}

/**
 * Read-only rating meter: a 5-cell scale bar (no stars, spec 2-4 / 4-2).
 * Filled cells = round half up of the displayed value (4.3 -> 4, 4.5 -> 5). One color only (primary);
 * empty cells are a 1px line-strong outline. The cells are decorative, the label carries the value.
 */
export function RatingMeter({ value, label, size = 'sm', className }: RatingMeterProps) {
  if (value === null) return null
  const filled = meterFillCount(value)
  const classes = sizeClasses[size]

  return (
    <span role="img" aria-label={label} className={cn('inline-flex items-center', classes.row, className)}>
      {Array.from({ length: CELL_COUNT }, (_, index) => {
        const isFilled = index < filled
        return (
          <span
            key={index}
            aria-hidden="true"
            data-filled={isFilled ? 'true' : 'false'}
            className={cn(
              'block rounded-xs border',
              classes.cell,
              isFilled ? 'border-primary bg-primary' : 'border-line-strong bg-transparent',
            )}
          />
        )
      })}
    </span>
  )
}
