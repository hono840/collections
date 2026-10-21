'use client'
/**
 * SegmentedControl — 2–3 mutually exclusive options (design-spec §8.1). Client.
 * Implemented as an ARIA radiogroup with roving tabindex + arrow-key navigation, so it is
 * keyboard operable like native radios. Selection is shown by a raised surface, never colour
 * alone. Generic over the option value union `T`.
 */
import { useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '../Icon'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  iconStart?: LucideIcon
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Required group label for assistive tech. */
  ariaLabel: string
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = options.findIndex((o) => o.value === value)
    if (idx < 0) return
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn('inline-flex gap-1 rounded-pill bg-surface-sunken p-1', fullWidth && 'flex w-full', className)}
    >
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-pill font-medium transition-colors',
              size === 'sm'
                ? 'text-body-sm min-h-[var(--tap-min-compact)] px-3'
                : 'text-label min-h-[var(--tap-min)] px-4',
              fullWidth && 'flex-1',
              selected ? 'bg-surface text-primary-ink shadow-sm' : 'text-ink-secondary hover:text-ink',
            )}
          >
            {o.iconStart && <Icon icon={o.iconStart} size="sm" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
