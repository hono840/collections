/**
 * BeforeAfterStat — before → after comparison with a coloured delta (design-spec §4.4 / §8.2).
 * Server-compatible. Values are pre-formatted strings (caller uses format utils). Optional
 * per-side semaphore status adds the shape icon + colour so rate comparisons are not colour-only.
 */
import { ArrowRight } from 'lucide-react'
import type { AlertStatus } from '@/lib/domain'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { SEMAPHORE } from '@/components/atoms/StatusDot'

export interface BeforeAfterStatProps {
  label?: string
  before: string
  after: string
  /** Pre-formatted delta, e.g. 「+￥120」. */
  delta?: string
  deltaTone?: 'good' | 'danger' | 'neutral'
  beforeStatus?: AlertStatus
  afterStatus?: AlertStatus
  className?: string
}

const DELTA_TONE = {
  good: 'text-good-fg',
  danger: 'text-danger-fg',
  neutral: 'text-ink-secondary',
} as const

function Side({ text, status, emphasis }: { text: string; status?: AlertStatus; emphasis?: boolean }) {
  const color = status ? SEMAPHORE[status].fg : emphasis ? 'text-ink' : 'text-ink-muted'
  return (
    <span className={cn('font-num inline-flex items-center gap-1 tabular-nums', emphasis ? 'text-metric-lg' : 'text-metric', color)}>
      {status && <Icon icon={SEMAPHORE[status].icon} size="sm" />}
      {text}
    </span>
  )
}

export function BeforeAfterStat({
  label,
  before,
  after,
  delta,
  deltaTone = 'neutral',
  beforeStatus,
  afterStatus,
  className,
}: BeforeAfterStatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <div className="text-label text-ink-secondary">{label}</div>}
      <div className="flex items-center gap-3">
        <Side text={before} status={beforeStatus} />
        <Icon icon={ArrowRight} size="sm" className="text-ink-muted" />
        <Side text={after} status={afterStatus} emphasis />
      </div>
      {delta && <div className={cn('text-body-sm font-num tabular-nums', DELTA_TONE[deltaTone])}>{delta}</div>}
    </div>
  )
}
