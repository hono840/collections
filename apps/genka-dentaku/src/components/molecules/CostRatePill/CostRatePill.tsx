/**
 * CostRatePill — cost-rate chip with the full quadruple encoding (design-spec §2.4 / §8.2).
 * Server-compatible. Colour (fg on soft bg) + icon SHAPE + tabular % + text LABEL, plus an
 * aria-label that states rate AND status word (e.g. 「原価率32.0%、注意」) for screen readers
 * (§6.5). Never colour-only.
 */
import type { AlertStatus } from '@/lib/domain'
import { formatPercent1 } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { SEMAPHORE } from '@/components/atoms/StatusDot'

export interface CostRatePillProps {
  /** Cost rate percent, 1 decimal (e.g. 32.0). null -> 要確認 / 「—」. */
  rate: number | null
  status: AlertStatus
  size?: 'sm' | 'md'
  className?: string
}

export function CostRatePill({ rate, status, size = 'md', className }: CostRatePillProps) {
  const desc = SEMAPHORE[status]
  const rateText = rate === null ? '—' : formatPercent1(rate)
  const ariaLabel = rate === null ? `原価率 未算出、${desc.label}` : `原価率${rateText}、${desc.label}`
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill',
        desc.bg,
        desc.fg,
        size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1',
        className,
      )}
    >
      <Icon icon={desc.icon} size={size === 'sm' ? 'sm' : 'md'} />
      <span className={cn('font-num tabular-nums', size === 'sm' ? 'text-metric' : 'text-metric-lg')}>{rateText}</span>
      <span className="text-label">{desc.label}</span>
    </span>
  )
}
