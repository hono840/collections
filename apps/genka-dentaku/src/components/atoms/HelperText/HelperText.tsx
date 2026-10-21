/**
 * HelperText — hint / error copy under a field (design-spec §4.2 / §8.1). Server-compatible.
 * Danger tone is never colour-only: it pairs the danger ink with a △ warning icon so the error
 * survives CVD / forced-colors (§6.5).
 */
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '../Icon'

export interface HelperTextProps {
  tone?: 'muted' | 'danger'
  /** Wire this to the control's aria-describedby. */
  id?: string
  showIcon?: boolean
  children: React.ReactNode
  className?: string
}

export function HelperText({ tone = 'muted', id, showIcon = true, children, className }: HelperTextProps) {
  const danger = tone === 'danger'
  return (
    <p
      id={id}
      className={cn('text-body-sm flex items-start gap-1', danger ? 'text-danger-fg' : 'text-ink-muted', className)}
    >
      {danger && showIcon && <Icon icon={TriangleAlert} size="sm" className="mt-0.5" />}
      <span>{children}</span>
    </p>
  )
}
