import type { ReactNode } from 'react'

export type AppShellTemplateProps = {
  /** Header slot (AppHeader). */
  header: ReactNode
  /** Overlays that sit outside the main flow (e.g. the first-run notice). */
  overlay?: ReactNode
  children: ReactNode
}

/**
 * Layout for signed-in pages: header + main column (from 360px wide, max 1200px).
 * Tab bar / side nav arrive with more destinations (S2).
 */
export function AppShellTemplate({ header, overlay, children }: AppShellTemplateProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {header}
      <main
        id="main"
        className="mx-auto w-full max-w-300 flex-1 px-4 py-8 md:px-5 md:py-12 lg:px-6"
      >
        {children}
      </main>
      {overlay}
    </div>
  )
}
