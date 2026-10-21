/**
 * Chip — compact tag / filter, optionally removable (design-spec §8.1). Server-compatible.
 * Used for sample tags and filters. When `onRemove` is set it renders a real 44px remove
 * button with its own accessible name; the chip body stays non-interactive text.
 */
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '../Icon'

export type ChipTone = 'neutral' | 'info'

const TONE: Record<ChipTone, string> = {
  neutral: 'bg-surface-sunken text-ink-secondary',
  info: 'bg-primary-subtle text-primary-ink',
}

export interface ChipProps {
  label: string
  tone?: ChipTone
  onRemove?: () => void
  /** Accessible name for the remove button (defaults from the label). */
  removeLabel?: string
  className?: string
}

export function Chip({ label, tone = 'neutral', onRemove, removeLabel, className }: ChipProps) {
  return (
    <span
      className={cn(
        'text-body-sm inline-flex items-center gap-1 rounded-pill py-1 pl-3',
        onRemove ? 'pr-1' : 'pr-3',
        TONE[tone],
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `${label}を削除`}
          className="inline-flex min-h-[var(--tap-min-compact)] min-w-[var(--tap-min-compact)] items-center justify-center rounded-pill text-ink-muted transition-colors hover:text-ink"
        >
          <Icon icon={X} size="sm" />
        </button>
      )}
    </span>
  )
}
