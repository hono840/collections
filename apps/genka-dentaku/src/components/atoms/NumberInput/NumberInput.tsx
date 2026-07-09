'use client'
/**
 * NumberInput — numeric field with tabular, right-aligned figures (design-spec §2.5 / §8.1).
 * Client. Uses type="text" + inputMode so decimals can be typed freely (e.g. "2.", "0.25")
 * while emitting a parsed `number | null`; value is mirrored in local string state and
 * re-synced when the external value changes (adjust-state-during-render, no effect).
 * Optional ¥ prefix / unit suffix adornments. 16px font (iOS), 48px min height.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: number | null
  onChange: (value: number | null) => void
  error?: boolean
  /** Trailing unit adornment (円 / g / % …). */
  unit?: string
  /** Leading adornment (¥ …). */
  prefix?: string
  inputMode?: 'decimal' | 'numeric'
  ref?: React.Ref<HTMLInputElement>
}

function toText(v: number | null): string {
  return v === null || Number.isNaN(v) ? '' : String(v)
}

export function NumberInput({
  value,
  onChange,
  error = false,
  unit,
  prefix,
  inputMode = 'decimal',
  className,
  ref,
  ...rest
}: NumberInputProps) {
  const [text, setText] = useState(() => toText(value))
  const [lastValue, setLastValue] = useState(value)

  // Re-sync local text when the external numeric value changes to something the text can't parse to.
  if (value !== lastValue) {
    setLastValue(value)
    const parsed = text.trim() === '' ? null : Number(text)
    if (parsed !== value) setText(toText(value))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    const trimmed = raw.trim()
    if (trimmed === '') {
      onChange(null)
      return
    }
    const num = Number(trimmed)
    if (!Number.isNaN(num)) onChange(num)
    // Partial / invalid input (e.g. "1.2.3") keeps the text but does not emit.
  }

  return (
    <div className="relative flex items-center">
      {prefix && <span className="text-body pointer-events-none absolute left-3 text-ink-muted">{prefix}</span>}
      <input
        ref={ref}
        type="text"
        inputMode={inputMode}
        value={text}
        onChange={handleChange}
        aria-invalid={error || undefined}
        className={cn(
          'font-num text-body block min-h-[var(--input-min-h)] w-full rounded-md border bg-surface text-right tabular-nums text-ink',
          'placeholder:text-ink-muted disabled:bg-surface-sunken disabled:opacity-60',
          prefix ? 'pl-8' : 'pl-3',
          unit ? 'pr-10' : 'pr-3',
          error ? 'border-danger-fg' : 'border-border-strong',
          className,
        )}
        {...rest}
      />
      {unit && <span className="text-body-sm pointer-events-none absolute right-3 text-ink-muted">{unit}</span>}
    </div>
  )
}
