import type { ReactNode } from 'react'

export type AuthTemplateProps = {
  /** Screen title (h1). */
  title: ReactNode
  /** Short line under the title. */
  description?: ReactNode
  /** Policy footer (M-29). */
  footer?: ReactNode
  children: ReactNode
}

/**
 * Centered card layout for the login screens. The faint contour lines are
 * decorative (spec 3-1: allowed on the login screen, kept light).
 */
export function AuthTemplate({ title, description, footer, children }: AuthTemplateProps) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <ContourBackdrop />
      <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 md:px-5">
        <p className="heading-mincho text-center text-2xl text-ink">公道レビュー</p>
        <div className="mt-6 rounded-md border border-line bg-surface-raised p-6 shadow-1 md:p-8">
          <h1 className="text-lg font-bold text-ink">{title}</h1>
          {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </main>
      {footer ? (
        <footer className="relative px-4 pb-8 text-center text-xs text-ink-muted">{footer}</footer>
      ) : null}
    </div>
  )
}

/** Gentle, widely spaced contour lines ("other" pattern); every 5th line is an index contour. */
function ContourBackdrop() {
  const radii = [60, 110, 160, 210, 260, 310, 360, 410, 460, 510]
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute -top-40 -right-40 size-240 text-accent"
      style={{ opacity: 'var(--rr-contour-opacity)' }}
      viewBox="0 0 1000 1000"
      fill="none"
    >
      {radii.map((radius, index) => (
        <ellipse
          key={radius}
          cx="560"
          cy="420"
          rx={radius * 1.15}
          ry={radius * 0.82}
          transform="rotate(-18 560 420)"
          stroke="currentColor"
          strokeWidth={(index + 1) % 5 === 0 ? 1.75 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
