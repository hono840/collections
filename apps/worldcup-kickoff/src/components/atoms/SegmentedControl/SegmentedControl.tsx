'use client'

import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  /** 任意の先頭アイコン（装飾） */
  icon?: React.ReactNode
}

export interface SegmentedControlProps<T extends string> {
  /** 選択肢 */
  options: ReadonlyArray<SegmentedControlOption<T>>
  /** 現在値 */
  value: T
  /** 選択変更ハンドラ */
  onChange: (value: T) => void
  /** グループ全体のラベル（A11y 必須） */
  ariaLabel: string
  /** フル幅で均等割り */
  fullWidth?: boolean
  className?: string
}

/**
 * セグメント切替（タブ/フィルタ）。
 * `role="radiogroup"` + 各オプション `role="radio"` で実装し、
 * 左右/上下矢印キーで移動・選択できる（roving tabindex）。
 * 選択中以外は tabIndex=-1 とし、フォーカスはグループ内で 1 つに集約する。
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const focusIndex = useCallback((index: number) => {
    const el = refs.current[index]
    el?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentIndex: number) => {
      const last = options.length - 1
      let nextIndex: number | null = null

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = currentIndex === last ? 0 : currentIndex + 1
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = currentIndex === 0 ? last : currentIndex - 1
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = last
          break
        default:
          return
      }

      event.preventDefault()
      const nextOption = options[nextIndex]
      if (nextOption) {
        onChange(nextOption.value)
        focusIndex(nextIndex)
      }
    },
    [options, onChange, focusIndex],
  )

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex gap-1 rounded-2xl border border-border bg-bg p-1',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors',
              isSelected
                ? 'bg-surface text-pitch-700 shadow-sm'
                : 'text-text-muted hover:text-text',
            )}
          >
            {option.icon != null && (
              <span className="inline-flex shrink-0" aria-hidden>
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
