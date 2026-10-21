/**
 * Divider — hairline separator (design-spec §2.7 / §8.1). Server-compatible.
 * Uses the warm neutral hairline; never a hard black rule.
 */
import { cn } from '@/lib/utils/cn'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  /** Horizontal only: inset the rule from the screen gutter. */
  inset?: boolean
  className?: string
}

export function Divider({ orientation = 'horizontal', inset = false, className }: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('w-px self-stretch bg-border', className)}
      />
    )
  }
  return <hr className={cn('h-px border-0 bg-border', inset && 'mx-4', className)} />
}
