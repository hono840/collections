/**
 * CostRateMeter — horizontal 0..max% meter with threshold ticks (design-spec §4.3 / §6.3 / §8.2).
 * Server-compatible. The fill colour follows the domain `alertStatus` on the same thresholds the
 * app uses, so meter colour always matches the pill. role=meter with an aria-valuetext that
 * states the percent AND status word.
 */
import { alertStatus, type AlertStatus } from '@/lib/domain'
import { formatPercent1 } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { SEMAPHORE } from '@/components/atoms/StatusDot'

export interface CostRateMeterProps {
  /** Cost rate percent (e.g. 32.0). null -> empty track (未算出). */
  rate: number | null
  warn: number
  danger: number
  max?: number
  ariaLabel?: string
  className?: string
}

export function CostRateMeter({ rate, warn, danger, max = 100, ariaLabel = '原価率メーター', className }: CostRateMeterProps) {
  const status: AlertStatus = alertStatus(rate, warn, danger)
  const clamped = rate === null ? 0 : Math.max(0, Math.min(max, rate))
  const pct = max === 0 ? 0 : (clamped / max) * 100
  const warnPct = max === 0 ? 0 : (warn / max) * 100
  const dangerPct = max === 0 ? 0 : (danger / max) * 100
  const valueText = rate === null ? '未算出' : `${formatPercent1(rate)}、${SEMAPHORE[status].label}`

  return (
    <div
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={rate ?? undefined}
      aria-valuetext={valueText}
      className={cn('relative h-3 w-full overflow-hidden rounded-pill bg-surface-sunken', className)}
    >
      <div className={cn('h-full rounded-pill transition-all', SEMAPHORE[status].solid)} style={{ width: `${pct}%` }} />
      <span aria-hidden className="absolute top-0 bottom-0 w-px bg-ink-muted" style={{ left: `${warnPct}%` }} />
      <span aria-hidden className="absolute top-0 bottom-0 w-px bg-ink-muted" style={{ left: `${dangerPct}%` }} />
    </div>
  )
}
