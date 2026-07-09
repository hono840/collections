'use client'
/**
 * AppHeader — the sticky top bar of the tool (design-spec §3 / §8.3). Screen title on the left,
 * an optional back affordance when inside a sub-view (recipe editor), a context-action slot on the
 * right, and the always-present TrustBadge (compact) that reinforces the 「データは端末内のみ」 privacy
 * contract on every screen (§1.4 / §9.2). Safe-area aware.
 */
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { IconButton } from '@/components/atoms/IconButton'
import { TrustBadge } from '@/components/molecules/TrustBadge'

export interface AppHeaderProps {
  title: string
  /** When set, a back button is shown (e.g. leaving the recipe editor). */
  onBack?: () => void
  backLabel?: string
  /** Right-aligned context actions (before the TrustBadge). */
  actions?: React.ReactNode
  className?: string
}

export function AppHeader({ title, onBack, backLabel = '戻る', actions, className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-sticky-header)] flex items-center gap-2 border-b border-border bg-surface px-2 shadow-sm',
        className,
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {onBack && <IconButton icon={ChevronLeft} label={backLabel} onClick={onBack} />}
      <h1 className={cn('text-h1 flex-1 truncate text-ink', onBack ? 'pl-0' : 'pl-2')}>{title}</h1>
      {actions}
      <TrustBadge variant="compact" className="mr-1 shrink-0" />
    </header>
  )
}
