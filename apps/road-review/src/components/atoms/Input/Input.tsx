import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Marks the field as invalid (aria-invalid="true" + 2px danger border). */
  invalid?: boolean
}

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={cn(
        // 48px tall, 16px text so iOS does not zoom in (spec 4-13)
        'block min-h-12 w-full rounded-sm border border-line-strong bg-surface-raised px-3 text-base text-ink',
        'placeholder:text-ink-subtle',
        'focus-visible:border-2 focus-visible:border-primary',
        'disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-subtle',
        invalid && 'border-2 border-danger focus-visible:border-danger',
        className,
      )}
    />
  )
}
