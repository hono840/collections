/**
 * AppShell — the tool's mobile frame (design-spec §3 / §8.4). Structural, data-agnostic template:
 * a sticky header slot, a single scrollable main, the bottom nav, a FAB slot (dashboard 新規メニュー),
 * and an overlay slot for sheets / dialogs / toasts / the RecalcIndicator (rendered last so it stacks
 * above everything). On desktop the frame is a centered max-w column with side borders; safe-area
 * insets are handled by the header / nav themselves.
 */
import { cn } from '@/lib/utils/cn'

export interface AppShellProps {
  header: React.ReactNode
  nav: React.ReactNode
  /** Floating action slot (positioned above the bottom nav). */
  fab?: React.ReactNode
  /** Sheets / dialogs / toasts / recalc indicator (fixed-positioned, stacked last). */
  overlay?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function AppShell({ header, nav, fab, overlay, children, className }: AppShellProps) {
  return (
    <div className={cn('relative mx-auto flex min-h-dvh max-w-lg flex-col bg-bg sm:border-x sm:border-border', className)}>
      {header}
      <main className="relative flex-1 overflow-y-auto px-4 pt-4 pb-6">{children}</main>
      {fab && <div className="absolute right-4 bottom-20 z-[var(--z-bottom-nav)]">{fab}</div>}
      {nav}
      {overlay}
    </div>
  )
}
