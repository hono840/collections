/**
 * StatusDot — cost-rate status token (design-spec §2.4 / §8.1). Server-compatible.
 * Encodes status by SHAPE (icon) + COLOUR + optional LABEL so it is never colour-only (§6.5).
 * The status word is always available to assistive tech via the icon title (or the visible label).
 */
import { cn } from '@/lib/utils/cn'
import type { AlertStatus } from '@/lib/domain'
import { Icon, type IconSize } from '../Icon'
import { SEMAPHORE } from './semaphore'

export interface StatusDotProps {
  status: AlertStatus
  size?: IconSize
  /** Render the Japanese status word next to the shape. */
  showLabel?: boolean
  /** Override the announced/visible label (defaults to the status word). */
  label?: string
  className?: string
}

export function StatusDot({ status, size = 'md', showLabel = false, label, className }: StatusDotProps) {
  const desc = SEMAPHORE[status]
  const text = label ?? desc.label
  return (
    <span className={cn('inline-flex items-center gap-1', desc.fg, className)}>
      {/* When the label is visible, the icon is decorative; otherwise it carries the status word. */}
      <Icon icon={desc.icon} size={size} title={showLabel ? undefined : text} />
      {showLabel && <span className="text-label">{text}</span>}
    </span>
  )
}
