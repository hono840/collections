'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { FieldError } from '@/components/atoms/FieldError'
import { cn } from '@/lib/utils/cn'

export type RatingScaleLabels = readonly [string, string, string, string, string]

export type RatingInputProps = {
  /** Shared name of the 5 radios. */
  name: string
  legend: string
  /** The word for each value 1..5 (index 0..4). */
  labels: RatingScaleLabels
  value: number | null
  onChange: (value: number | null) => void
  required?: boolean
  error?: string
  id?: string
  className?: string
}

const VALUES = [1, 2, 3, 4, 5] as const

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown'])
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp'])

/**
 * 1-5 rating as a "scale bar" of 5 cells (spec 4-2, UX 6). No stars.
 * Native radios (one per cell) with a roving tabindex: Tab enters at the selected cell (or the first one),
 * arrow keys move and select, wrapping at the ends (WAI-ARIA APG radio group).
 * The status line "選択中: 4（良い）" is a polite live region. Optional axes get a "選択を解除" button
 * after a value is chosen; required axes never do.
 */
export function RatingInput({
  name,
  legend,
  labels,
  value,
  onChange,
  required = false,
  error,
  id,
  className,
}: RatingInputProps) {
  const generatedId = useId()
  const groupId = id ?? generatedId
  const legendId = `${groupId}-legend`
  const errorId = `${groupId}-error`
  const radioRefs = useRef<Array<HTMLInputElement | null>>([])
  const [clearedAnnouncement, setClearedAnnouncement] = useState(false)

  const tabStopValue = value ?? 1
  const statusText = value === null ? '選択中: 未選択' : `選択中: ${value}（${labels[value - 1]}）`

  function select(next: number) {
    setClearedAnnouncement(false)
    onChange(next)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, current: number) {
    let next: number | null = null
    if (NEXT_KEYS.has(event.key)) next = current === 5 ? 1 : current + 1
    if (PREVIOUS_KEYS.has(event.key)) next = current === 1 ? 5 : current - 1
    if (next === null) return
    event.preventDefault()
    select(next)
    radioRefs.current[next - 1]?.focus()
  }

  function clear() {
    onChange(null)
    setClearedAnnouncement(true)
    radioRefs.current[0]?.focus()
  }

  const showClearButton = !required && value !== null

  return (
    <div
      id={groupId}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      className={cn('min-w-0', className)}
    >
      <span id={legendId} className="inline-flex items-center gap-2 text-sm font-bold text-ink">
        {legend}
        {required ? (
          <span className="rounded-full border border-ink-muted px-2 text-xs font-bold text-ink-muted">必須</span>
        ) : null}
      </span>

      <div className="mt-1.5 inline-flex flex-col">
        <div className="flex gap-1.5">
          {VALUES.map((cellValue) => {
            const checked = value === cellValue
            const filled = value !== null && cellValue <= value
            return (
              <label key={cellValue} className="relative block size-11">
                <input
                  ref={(element) => {
                    radioRefs.current[cellValue - 1] = element
                  }}
                  type="radio"
                  name={name}
                  value={cellValue}
                  checked={checked}
                  aria-label={`${cellValue}、${labels[cellValue - 1]}`}
                  tabIndex={cellValue === tabStopValue ? 0 : -1}
                  onChange={() => select(cellValue)}
                  onKeyDown={(event) => handleKeyDown(event, cellValue)}
                  className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-sm opacity-0"
                />
                <span
                  className={cn(
                    'pointer-events-none flex size-full items-center justify-center rounded-sm border',
                    'num text-base font-bold transition-colors duration-140 ease-standard',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                    filled
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-line-strong bg-surface-raised text-ink-muted peer-hover:border-ink',
                    error && !filled && 'border-2 border-danger',
                  )}
                >
                  {cellValue}
                </span>
                {checked ? (
                  // The "you are here" mark under the selected cell (shape, not only color).
                  <span aria-hidden="true" className="absolute inset-x-2 -bottom-1.5 h-0.75 rounded-full bg-ink" />
                ) : null}
              </label>
            )
          })}
        </div>
        <div aria-hidden="true" className="mt-2.5 flex justify-between gap-4 text-xs text-ink-muted">
          <span>{labels[0]}</span>
          <span>{labels[4]}</span>
        </div>
      </div>

      <div className="mt-1 flex min-h-11 flex-wrap items-center justify-between gap-x-4">
        <p aria-live="polite" className="text-sm text-ink">
          <span>{statusText}</span>
          {clearedAnnouncement ? <span className="sr-only">選択を解除しました</span> : null}
        </p>
        {showClearButton ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            選択を解除
          </Button>
        ) : null}
      </div>
      <FieldError id={errorId} className="mt-0">
        {error}
      </FieldError>
    </div>
  )
}
