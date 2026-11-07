import type { RoadType } from '@/types/road'
import { cn } from '@/lib/utils/cn'

export type RoadTypeSymbolProps = {
  roadType: RoadType
  className?: string
}

const symbolColorClasses: Record<RoadType, string> = {
  pass: 'text-type-pass',
  skyline: 'text-type-skyline',
  coastal: 'text-type-coastal',
  forest: 'text-type-forest',
  other: 'text-type-other',
}

/**
 * Decorative road type symbol (spec 2-3). Meaning is always carried by the text label next to it,
 * so the SVG is hidden from assistive technology.
 */
export function RoadTypeSymbol({ roadType, className }: RoadTypeSymbolProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-3.5 shrink-0', symbolColorClasses[roadType], className)}
    >
      {roadType === 'pass' ? (
        // Pass mark ")(": two arcs back to back
        <>
          <path d="M9 4c-3 4.5-3 11.5 0 16" />
          <path d="M15 4c3 4.5 3 11.5 0 16" />
        </>
      ) : null}
      {roadType === 'skyline' ? (
        // Gentle ridge line with a line above it
        <>
          <path d="M3 18l5-6 4 3 4-5 5 8" />
          <path d="M4 6h16" />
        </>
      ) : null}
      {roadType === 'coastal' ? (
        // Land line with two waves below
        <>
          <path d="M3 7h18" />
          <path d="M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
          <path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
        </>
      ) : null}
      {roadType === 'forest' ? (
        // Conifer: triangle and a short trunk
        <>
          <path d="M12 3l7 13H5z" />
          <path d="M12 16v5" />
        </>
      ) : null}
      {roadType === 'other' ? (
        // Ring with a dot in the centre
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </>
      ) : null}
    </svg>
  )
}
