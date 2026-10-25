import type { Ref } from 'react'
import { cn } from '@/lib/utils/cn'

export type TextFieldProps = {
  id: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Renders a <textarea> instead of <input type="text">. */
  multiline?: boolean
  /** Textarea only. */
  rows?: number
  /** Single-line only. 'decimal' opens the number keypad on phones. */
  inputMode?: 'text' | 'decimal'
  /** Sets aria-invalid. The look stays as in the design (the error text says what is wrong). */
  invalid?: boolean
  /** id of the element that describes the field, e.g. its error message. */
  describedBy?: string
  /** Single-line only (used to focus the first invalid field). */
  ref?: Ref<HTMLInputElement>
}

// The design's .fld. 16px text keeps iOS Safari from zooming in on focus. The accent border is the
// focus style; outline-hidden (not outline-none) keeps the outline in forced-colors mode (AC18).
const FIELD_CLASS_NAME =
  'w-full rounded-xl border border-edge bg-panel px-3.5 py-3 text-16 text-ink outline-hidden placeholder:text-ink-faint focus:border-accent'

/** Controlled <input type="text"> or <textarea>. */
export function TextField({
  id,
  value,
  onValueChange,
  placeholder,
  multiline = false,
  rows = 4,
  inputMode,
  invalid = false,
  describedBy,
  ref,
}: TextFieldProps) {
  const sharedAttributes = {
    id,
    value,
    placeholder,
    autoComplete: 'off',
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
  }

  if (multiline) {
    return (
      <textarea
        {...sharedAttributes}
        rows={rows}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(FIELD_CLASS_NAME, 'resize-none leading-note')}
      />
    )
  }

  return (
    <input
      {...sharedAttributes}
      ref={ref}
      type="text"
      inputMode={inputMode}
      onChange={(event) => onValueChange(event.target.value)}
      className={FIELD_CLASS_NAME}
    />
  )
}
