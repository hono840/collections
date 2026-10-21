/**
 * Label — form label (design-spec §8.1). Server-compatible.
 * The required marker is decorative (aria-hidden); required state is conveyed to AT via
 * aria-required on the associated control.
 */
import { cn } from '@/lib/utils/cn'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ required = false, children, className, ...rest }: LabelProps) {
  return (
    <label className={cn('text-label text-ink-secondary', className)} {...rest}>
      {children}
      {required && (
        <span aria-hidden className="ml-0.5 text-danger-fg">
          *
        </span>
      )}
    </label>
  )
}
