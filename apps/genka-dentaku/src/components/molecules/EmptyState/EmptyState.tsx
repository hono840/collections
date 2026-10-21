/**
 * EmptyState — illustration-free empty view: single-line icon + copy + CTA slot
 * (design-spec §5.1 / §8.2). Server-compatible. Copy should state the next step, not the lack.
 * CTAs are provided via `children` so callers compose Buttons (primary + secondary).
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  /** CTA slot (e.g. primary + secondary Button). */
  children?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <Icon icon={icon} size="xl" className="text-ink-muted" />
      <h3 className="text-h3 text-ink">{title}</h3>
      {description && <p className="text-body-sm max-w-xs text-ink-secondary">{description}</p>}
      {children && <div className="mt-2 flex w-full max-w-xs flex-col items-stretch gap-2">{children}</div>}
    </div>
  )
}
