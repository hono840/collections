'use client'

import { cn } from '@/lib/utils/cn'

export interface ColorSwatchProps {
  /** 色の値 (hex) */
  color: string
  /** 選択状態 */
  selected?: boolean
  /** クリック時のコールバック */
  onClick?: () => void
  className?: string
}

export function ColorSwatch({
  color,
  selected = false,
  onClick,
  className,
}: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 w-8 rounded-full border-2 transition-transform',
        selected
          ? 'scale-110 border-slate-900 dark:border-white'
          : 'border-transparent hover:scale-105',
        className
      )}
      style={{ backgroundColor: color }}
      aria-label={color}
      aria-pressed={selected}
    />
  )
}
