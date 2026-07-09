/**
 * Skeleton — loading placeholder (design-spec §4.1 / §8.1). Server-compatible.
 * Neutral shimmer; static under prefers-reduced-motion (globals.css §6.6). Decorative.
 */
import { cn } from '@/lib/utils/cn'

type Radius = 'sm' | 'md' | 'lg' | 'pill'
const RADIUS: Record<Radius, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  pill: 'rounded-pill',
}

export interface SkeletonProps {
  w?: string | number
  h?: string | number
  radius?: Radius
  className?: string
}

function toCss(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined
  return typeof v === 'number' ? `${v}px` : v
}

export function Skeleton({ w, h, radius = 'md', className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse bg-surface-sunken', RADIUS[radius], className)}
      style={{ width: toCss(w), height: toCss(h) }}
    />
  )
}
