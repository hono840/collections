import { useCallback } from 'react'
import type { Ref } from 'react'
import { cn } from '@/lib/utils/cn'

type FieldElement = HTMLInputElement | HTMLTextAreaElement

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
  /** id of the element that names the field when there is no <label>, e.g. the detail's メモ heading. */
  labelledBy?: string
  /**
   * Gets the <input>, or the <textarea> when multiline (used to focus the first invalid field and
   * the memo field when editing starts).
   */
  ref?: Ref<FieldElement>
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
  labelledBy,
  ref,
}: TextFieldProps) {
  // A ref object typed for either element cannot be given to <input> or <textarea> as it is, so
  // both get this callback ref, which hands the element on. Kept stable with useCallback so React
  // does not detach and re-attach the ref on every keystroke.
  const handleFieldElement = useCallback(
    (element: FieldElement | null) => {
      if (ref === null || ref === undefined) return
      // Returning the caller's cleanup lets React 19 call it instead of passing null on unmount.
      if (typeof ref === 'function') return ref(element)
      ref.current = element
    },
    [ref],
  )

  const sharedAttributes = {
    id,
    value,
    placeholder,
    autoComplete: 'off',
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    'aria-labelledby': labelledBy,
  }

  if (multiline) {
    return (
      <textarea
        {...sharedAttributes}
        ref={handleFieldElement}
        rows={rows}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(FIELD_CLASS_NAME, 'resize-none leading-note')}
      />
    )
  }

  return (
    <input
      {...sharedAttributes}
      ref={handleFieldElement}
      type="text"
      inputMode={inputMode}
      onChange={(event) => onValueChange(event.target.value)}
      className={FIELD_CLASS_NAME}
    />
  )
}
