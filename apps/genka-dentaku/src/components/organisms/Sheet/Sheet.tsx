'use client'
/**
 * Sheet — shared bottom-sheet / centered-dialog overlay primitive for the tool organisms
 * (design-spec §3 / §4.2–4.4 / §8.3). It is the single structural wrapper the sheet/dialog
 * organisms compose via the children slot (IngredientFormSheet / SimulationPanel / OnboardingSheet /
 * DataRecoveryDialog), so focus-trap + ESC/backdrop + aria-modal live in exactly one place instead
 * of being duplicated four times.
 *
 * a11y: role="dialog" + aria-modal, focus moves into the panel on open and is restored to the prior
 * element on close, Tab is trapped inside the panel, and ESC / backdrop close only when `dismissible`
 * (DataRecoveryDialog passes dismissible=false to block the app until recovery is resolved). Motion
 * is a fade; globals.css neutralizes it under prefers-reduced-motion.
 */
import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { IconButton } from '@/components/atoms/IconButton'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** 'sheet' = bottom-anchored (default), 'dialog' = centered modal. */
  variant?: 'sheet' | 'dialog'
  /** When false, ESC and backdrop do not close (blocking recovery dialog). */
  dismissible?: boolean
  /** Sticky footer slot (safe-area aware). */
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Sheet({
  open,
  onClose,
  title,
  variant = 'sheet',
  dismissible = true,
  footer,
  children,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Move focus into the panel on open; restore it to the previously focused element on close.
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(firstFocusable ?? panel)?.focus()
    return () => previouslyFocused?.focus?.()
  }, [open])

  // ESC to close (when dismissible) + Tab focus trap inside the panel.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, dismissible, onClose])

  if (!open) return null

  const isDialog = variant === 'dialog'
  return (
    <div
      className={cn('fixed inset-0 z-[var(--z-sheet)] flex justify-center', isDialog ? 'items-center' : 'items-end')}
    >
      <div aria-hidden onClick={dismissible ? onClose : undefined} className="absolute inset-0 bg-ink/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[90dvh] w-full flex-col bg-surface shadow-lg outline-none',
          isDialog ? 'mx-4 max-w-md rounded-lg' : 'max-w-lg rounded-t-lg',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-h2 text-ink">
            {title}
          </h2>
          {dismissible && <IconButton icon={X} label="閉じる" onClick={onClose} />}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div
            className="border-t border-border px-4 py-3"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
