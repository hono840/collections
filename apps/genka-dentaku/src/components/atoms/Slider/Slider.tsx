'use client'
/**
 * Slider — range input for the simulation target rate (design-spec §4.4 / §8.1). Client.
 * Native <input type="range"> for built-in slider semantics (role=slider, arrow keys,
 * aria-valuemin/max/now). Optional tick values render as a datalist plus a caption row so
 * thresholds (e.g. 30 / 35) are visible. Navy accent.
 */
import { useId } from 'react'
import { cn } from '@/lib/utils/cn'

export interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Tick positions to mark (e.g. threshold %). */
  ticks?: number[]
  ariaLabel: string
  /** Human-readable current value for screen readers (e.g. "30%"). */
  valueText?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  ticks,
  ariaLabel,
  valueText,
  disabled = false,
  id,
  className,
}: SliderProps) {
  const listId = useId()
  const hasTicks = ticks !== undefined && ticks.length > 0
  return (
    <div className={cn('w-full', className)}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        aria-valuetext={valueText}
        list={hasTicks ? listId : undefined}
        className="h-6 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
      {hasTicks && (
        <>
          <datalist id={listId}>
            {ticks.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className="relative mt-1 h-4" aria-hidden>
            {ticks.map((t) => {
              const pct = max === min ? 0 : ((t - min) / (max - min)) * 100
              return (
                <span
                  key={t}
                  className="text-caption absolute -translate-x-1/2 text-ink-muted"
                  style={{ left: `${pct}%` }}
                >
                  {t}
                </span>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
