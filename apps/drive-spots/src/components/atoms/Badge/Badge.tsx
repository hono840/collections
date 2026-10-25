import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type BadgeProps = {
  children: ReactNode
  /** 'accent' = category badge, 'done' = 行った badge. */
  tone: 'accent' | 'done'
}

/** Small pill label on the detail screen. Plain text, no role. */
export function Badge({ children, tone }: BadgeProps) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-13 font-bold text-canvas',
        tone === 'accent' ? 'bg-accent' : 'bg-done',
      )}
    >
      {children}
    </span>
  )
}
