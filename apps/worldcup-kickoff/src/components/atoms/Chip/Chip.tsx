'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  /** 選択状態（トグル）。aria-pressed に反映 */
  selected?: boolean
}

/**
 * 選択可能なチップ（診断選択肢・フィルタなど）。
 * トグルボタンとして `aria-pressed` を出力し、44px 以上のタップ領域を確保。
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-pitch-600 bg-pitch-600 text-white'
          : 'border-border bg-surface text-text hover:border-pitch-300 hover:bg-pitch-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
