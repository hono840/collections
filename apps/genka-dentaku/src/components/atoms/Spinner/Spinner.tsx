/**
 * Spinner — loading indicator (design-spec §8.1). Server-compatible.
 * By default it is an accessible live status; pass `decorative` when the parent already
 * conveys the busy state (e.g. a Button with aria-busy) to avoid double announcement.
 * Motion is disabled automatically under prefers-reduced-motion (globals.css §6.6).
 */
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label when standalone. Ignored when `decorative`. */
  label?: string
  /** Hide from assistive tech (parent conveys the loading state). */
  decorative?: boolean
  className?: string
}

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const

export function Spinner({ size = 'md', label = '読み込み中', decorative = false, className }: SpinnerProps) {
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'status', 'aria-label': label } as const)
  return <Loader2 size={SIZE_PX[size]} className={cn('animate-spin', className)} {...a11y} />
}
