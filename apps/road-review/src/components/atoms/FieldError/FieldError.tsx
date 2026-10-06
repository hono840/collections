import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export type FieldErrorProps = {
  /** Referenced from the input's aria-describedby. */
  id: string
  children?: ReactNode
  className?: string
}

/**
 * Field-level error message. Announced politely (not role="alert"; architecture 2.1).
 * Renders nothing when there is no message.
 */
export function FieldError({ id, children, className }: FieldErrorProps) {
  if (children === undefined || children === null || children === false || children === '') {
    return null
  }
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn('mt-1.5 flex items-start gap-1 text-sm font-bold text-danger', className)}
    >
      <span aria-hidden="true">!</span>
      {children}
    </p>
  )
}
