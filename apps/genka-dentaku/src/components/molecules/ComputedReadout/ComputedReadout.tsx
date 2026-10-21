/**
 * ComputedReadout — label + derived value + unit on a navy-subtle block (design-spec §4.2 / §8.2).
 * Server-compatible. Tabular figures so live updates never jitter. `null` renders 「—」.
 * `animate` is a presentational hint for the live-recalc layer; the count-up tween itself is
 * owned by a hook and injected by the parent — this component only reflects the current value.
 */
import { cn } from '@/lib/utils/cn'

export interface ComputedReadoutProps {
  label: string
  value: number | null
  unit?: string
  /** Formats the numeric value (default `String`). */
  formatValue?: (n: number) => string
  /** Shown when value is null (invalid inputs). */
  placeholder?: string
  size?: 'md' | 'lg'
  animate?: boolean
  className?: string
}

export function ComputedReadout({
  label,
  value,
  unit,
  formatValue = (n) => String(n),
  placeholder = '—',
  size = 'lg',
  animate = false,
  className,
}: ComputedReadoutProps) {
  const display = value === null ? placeholder : formatValue(value)
  return (
    <div className={cn('rounded-md bg-primary-subtle px-4 py-3', className)}>
      <div className="text-label text-ink-secondary">{label}</div>
      <div
        className={cn(
          'font-num tabular-nums text-primary-ink',
          size === 'lg' ? 'text-metric-lg' : 'text-metric',
          animate && 'transition-colors',
        )}
      >
        <span>{display}</span>
        {value !== null && unit && <span className="text-body-sm ml-1 text-ink-secondary">{unit}</span>}
      </div>
    </div>
  )
}
