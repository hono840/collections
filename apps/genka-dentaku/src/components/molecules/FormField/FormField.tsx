'use client'
/**
 * FormField — Label + control + HelperText/error wiring (design-spec §8.2). Client (useId).
 * Uses a render-prop child so the control receives a stable `id` (label association) and
 * `aria-describedby` / `invalid` (error announcement), keeping a11y correct without cloneElement.
 */
import { useId } from 'react'
import { cn } from '@/lib/utils/cn'
import { Label } from '@/components/atoms/Label'
import { HelperText } from '@/components/atoms/HelperText'

export interface FormFieldRenderProps {
  id: string
  describedBy: string | undefined
  invalid: boolean
}

export interface FormFieldProps {
  label: string
  required?: boolean
  /** Error message (takes precedence over hint and flips invalid). */
  error?: string
  /** Non-error helper text. */
  hint?: string
  className?: string
  children: (props: FormFieldRenderProps) => React.ReactNode
}

export function FormField({ label, required = false, error, hint, className, children }: FormFieldProps) {
  const id = useId()
  const hintId = useId()
  const errorId = useId()
  const invalid = Boolean(error)
  const describedBy = invalid ? errorId : hint ? hintId : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, describedBy, invalid })}
      {invalid ? (
        <HelperText id={errorId} tone="danger">
          {error}
        </HelperText>
      ) : hint ? (
        <HelperText id={hintId} tone="muted">
          {hint}
        </HelperText>
      ) : null}
    </div>
  )
}
