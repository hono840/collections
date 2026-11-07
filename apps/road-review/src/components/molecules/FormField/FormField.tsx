import type { ReactNode } from 'react'
import { FieldError } from '@/components/atoms/FieldError'
import { Label } from '@/components/atoms/Label'
import { cn } from '@/lib/utils/cn'

export type FormFieldProps = {
  /** id of the control. The hint is `${id}-hint` and the error is `${id}-error`. */
  id: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  /** The control. It wires aria-describedby / aria-invalid itself (the ids are deterministic). */
  children: ReactNode
}

/** Label + control + hint + field error (spec 4-13: label 6px above the control). */
export function FormField({ id, label, required = false, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  )
}
