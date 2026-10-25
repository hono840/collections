import type { ReactNode } from 'react'

export type IconName = 'check' | 'chevronRight' | 'chevronLeft' | 'plus' | 'road'

// Paths from docs/design/Main.dc.html (24x24 viewBox, stroked).
const ICON_SHAPES: Record<IconName, ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  road: (
    <>
      <path d="M4 19c3-1 4-5 8-7s5-6 8-7" />
      <circle cx="4" cy="19" r="1.5" />
      <circle cx="20" cy="5" r="1.5" />
    </>
  ),
}

type IconProps = {
  name: IconName
  /** Width and height in px. */
  size?: number
  strokeWidth?: number
  /** Color comes from `currentColor`, so set it with a text-* class. */
  className?: string
}

/** Decorative inline SVG. Always hidden from assistive technology; the control carries the name. */
export function Icon({ name, size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICON_SHAPES[name]}
    </svg>
  )
}
