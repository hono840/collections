/**
 * PlanFeatureRow — one comparison row in the pricing table (design-spec §4.5 / §8.2).
 * Server-compatible. Boolean cells render an accessible ○ (対応) / — (非対応) with icon + title,
 * string cells render text (e.g. 「3件まで」). Flagship rows carry a thin gold hairline.
 */
import { Check, Minus, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'

export interface PlanFeatureRowProps {
  feature: string
  free: boolean | string
  pro: boolean | string
  /** Gold hairline for flagship feature rows. */
  highlight?: boolean
  className?: string
}

function Cell({ value, plan }: { value: boolean | string; plan: 'free' | 'pro' }) {
  if (typeof value === 'string') {
    return <span className="text-body-sm text-ink-secondary">{value}</span>
  }
  if (value) {
    return <Icon icon={Check} size="md" title="対応" className={plan === 'pro' ? 'text-primary-ink' : 'text-good-fg'} />
  }
  // Free 非対応: muted dash + lock (Pro のみ), never a danger colour (§4.5).
  return (
    <span className="inline-flex items-center gap-0.5 text-ink-muted">
      <Icon icon={Minus} size="sm" title="非対応" />
      <Icon icon={Lock} size="xs" />
    </span>
  )
}

export function PlanFeatureRow({ feature, free, pro, highlight = false, className }: PlanFeatureRowProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_4rem_4rem] items-center gap-3 py-3',
        highlight ? 'border-t border-pro' : 'border-t border-border',
        className,
      )}
    >
      <span className="text-body text-ink">{feature}</span>
      <span className="flex justify-center">
        <Cell value={free} plan="free" />
      </span>
      <span className="flex justify-center">
        <Cell value={pro} plan="pro" />
      </span>
    </div>
  )
}
