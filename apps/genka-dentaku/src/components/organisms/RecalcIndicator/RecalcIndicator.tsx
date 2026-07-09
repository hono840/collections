'use client'
/**
 * RecalcIndicator — the transient 「全メニューを再計算しました」 feedback that signs THE WEDGE
 * (design-spec §1.2 / §5.2 / §8.3). When an ingredient price change propagates, the parent flips
 * `visible` for ~1.4s; this pill fades in near the top of the tool.
 *
 * Motion is CSS-only (opacity transition), so it is automatically neutralized under
 * prefers-reduced-motion (globals.css §6.6). The live region is always mounted with aria-live so the
 * count change is announced once; the pill is visually hidden (opacity) rather than unmounted so the
 * announcement is reliable. Non colour-only: it carries an explicit ↻ icon + text.
 */
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'

export interface RecalcIndicatorProps {
  visible: boolean
  /** Number of menus that were recomputed by the change. */
  count: number
  /** Override the default message. */
  message?: string
  className?: string
}

export function RecalcIndicator({ visible, count, message, className }: RecalcIndicatorProps) {
  const text = message ?? `${count}件のメニューを再計算しました`
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-3 z-[var(--z-recalc-toast)] flex justify-center px-4',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-pill bg-primary px-3 py-1.5 text-white shadow-md transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <Icon icon={RefreshCw} size="sm" />
        <span className="text-body-sm font-num tabular-nums">{visible ? text : ''}</span>
      </span>
    </div>
  )
}
