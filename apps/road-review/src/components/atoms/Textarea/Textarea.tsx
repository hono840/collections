import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'

/** React 19: `ref` is a regular prop, so it passes through to the <textarea>. */
export type TextareaProps = ComponentProps<'textarea'> & {
  /** Marks the field as invalid (aria-invalid="true" + 2px danger border). */
  invalid?: boolean
}

/** Multi-line text input with the same look as Input (spec 4-13). */
export function Textarea({ invalid = false, className, rows = 5, ...rest }: TextareaProps) {
  return (
    <textarea
      {...rest}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'block min-h-30 w-full rounded-sm border border-line-strong bg-surface-raised px-3 py-2.5 text-base text-ink',
        'placeholder:text-ink-subtle',
        'focus-visible:border-2 focus-visible:border-primary',
        'disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-subtle',
        invalid && 'border-2 border-danger focus-visible:border-danger',
        className,
      )}
    />
  )
}
