import type { ReactNode } from 'react'

type AppShellProps = {
  children?: ReactNode
}

/**
 * The app frame (AC17): full width on phones, a centered 480px column on desktop, exactly 100dvh
 * tall so only the screens' own areas scroll. Left/right safe areas pad the outside; each screen
 * handles top/bottom. Screens absolutely position against this column (the add button).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh justify-center bg-canvas px-safe">
      <main className="relative flex h-dvh w-full max-w-app flex-col overflow-hidden bg-canvas font-sans text-ink">
        {children}
      </main>
    </div>
  )
}
