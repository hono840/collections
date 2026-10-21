/**
 * TrustBadge — the always-visible privacy contract 「データは端末内のみ」 (design-spec §1.4 / §8.2).
 * Server-compatible. `compact` shows the lock only (label carried on the icon for AT); `full`
 * shows the lock + visible text. Never implies external sync.
 */
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'

const TEXT = 'データは端末内のみ'

export interface TrustBadgeProps {
  variant?: 'compact' | 'full'
  className?: string
}

export function TrustBadge({ variant = 'full', className }: TrustBadgeProps) {
  const compact = variant === 'compact'
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-ink-secondary', className)}>
      <Icon icon={Lock} size="sm" title={compact ? TEXT : undefined} />
      {!compact && <span className="text-body-sm">{TEXT}</span>}
    </span>
  )
}
