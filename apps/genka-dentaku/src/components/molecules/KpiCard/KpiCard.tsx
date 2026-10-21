/**
 * KpiCard — labelled metric with optional semaphore colouring + caption (design-spec §4.1 / §8.2).
 * Server-compatible. The value is a pre-formatted node (caller uses format utils); `status`
 * colours it with the semaphore fg (e.g. danger-count card), `hero` uses the hero scale.
 */
import type { AlertStatus } from '@/lib/domain'
import { cn } from '@/lib/utils/cn'
import { SEMAPHORE } from '@/components/atoms/StatusDot'

export interface KpiCardProps {
  label: string
  value: React.ReactNode
  unit?: string
  /** Colour the value by cost-rate status. */
  status?: AlertStatus
  /** Secondary line, e.g. 前回比. */
  caption?: string
  hero?: boolean
  className?: string
}

export function KpiCard({ label, value, unit, status, caption, hero = false, className }: KpiCardProps) {
  const valueColor = status ? SEMAPHORE[status].fg : 'text-ink'
  return (
    <div className={cn('rounded-md bg-surface p-4 shadow-sm', className)}>
      <div className="text-label text-ink-secondary">{label}</div>
      <div className={cn('font-num tabular-nums', hero ? 'text-hero' : 'text-metric-lg', valueColor)}>
        {value}
        {unit && <span className="text-body-sm ml-1 text-ink-muted">{unit}</span>}
      </div>
      {caption && <div className="text-caption text-ink-muted">{caption}</div>}
    </div>
  )
}
