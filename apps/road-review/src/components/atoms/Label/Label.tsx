import type { LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /** Shows the visible text "必須" (required is never conveyed by color only). */
  required?: boolean
}

export function Label({ required = false, className, children, ...rest }: LabelProps) {
  return (
    <label
      {...rest}
      className={cn('inline-flex items-center gap-2 text-sm font-bold text-ink', className)}
    >
      {children}
      {required ? (
        <span className="rounded-full border border-ink-muted px-2 text-xs font-bold text-ink-muted">
          必須
        </span>
      ) : null}
    </label>
  )
}
