/**
 * Icon — thin wrapper around a lucide-react icon component (design-spec §8.1).
 * Server-compatible (no interactivity). Provides a fixed size map and an a11y contract:
 * decorative by default (aria-hidden), or announced as an image when `title` is set.
 * Icons are passed as components (tree-shakeable individual imports), never as name strings.
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** px sizes per token scale (§2.5 UI density). */
const SIZE_PX: Record<IconSize, number> = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32 }

export interface IconProps {
  /** The lucide icon component, e.g. `import { Lock } from 'lucide-react'`. */
  icon: LucideIcon
  size?: IconSize
  /** When set, the icon is announced (role=img, aria-label). Omit for decorative icons. */
  title?: string
  strokeWidth?: number
  className?: string
}

export function Icon({ icon: LucideComp, size = 'md', title, strokeWidth, className }: IconProps) {
  const a11y = title
    ? ({ role: 'img', 'aria-label': title } as const)
    : ({ 'aria-hidden': true, focusable: false } as const)
  return (
    <LucideComp
      size={SIZE_PX[size]}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      {...a11y}
    />
  )
}
