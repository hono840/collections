import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type EmptyStateProps = {
  message: string
  actionLabel?: string
  actionHref?: string
  className?: string
}

/** Empty state (E-01 etc.): decorative contour illustration + message + optional action link. */
export function EmptyState({ message, actionLabel, actionHref, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-md border border-line bg-surface-raised px-6 py-10 text-center',
        className,
      )}
    >
      <EmptyRoadIllustration />
      <p className="mt-4 max-w-sm text-base text-ink">{message}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className={cn(
            'mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-transparent px-5',
            'bg-primary text-base font-bold text-on-primary hover:bg-primary-hover active:bg-primary-active',
            'transition-colors duration-140 ease-standard',
          )}
        >
          <Plus aria-hidden="true" className="size-5" />
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

/** 160x120: gentle contour lines with one road passing through (spec 3-2). Decorative. */
function EmptyRoadIllustration() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 120"
      fill="none"
      className="h-30 w-40"
    >
      <g className="text-accent" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1}>
        <ellipse cx="80" cy="62" rx="70" ry="44" />
        <ellipse cx="80" cy="62" rx="52" ry="32" />
        <ellipse cx="80" cy="62" rx="34" ry="20" />
        <ellipse cx="80" cy="62" rx="16" ry="9" />
      </g>
      <path
        className="text-ink"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        d="M8 104c22-6 30-22 46-30s30 2 44-12 22-34 54-46"
      />
    </svg>
  )
}
