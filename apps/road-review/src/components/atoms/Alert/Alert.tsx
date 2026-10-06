import type { AriaRole, ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Info } from 'lucide-react'
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type AlertVariant = 'info' | 'warning' | 'error'

export type AlertProps = {
  variant?: AlertVariant
  title?: ReactNode
  /** Overrides the default role (error -> "alert"; others have none). */
  role?: AriaRole
  /** Replaces the default decorative icon. Rendered inside an aria-hidden wrapper. */
  icon?: ReactNode
  className?: string
  children?: ReactNode
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-info-subtle border-info/35',
  warning: 'bg-warning-subtle border-transparent',
  error: 'bg-danger-subtle border-danger/40',
}

const iconColorClasses: Record<AlertVariant, string> = {
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-danger',
}

const defaultIcons: Record<AlertVariant, typeof Info> = {
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
}

/** Status message conveyed by icon + text, never by color only. */
export function Alert({ variant = 'info', title, role, icon, className, children }: AlertProps) {
  const DefaultIcon = defaultIcons[variant]
  return (
    <div
      role={role ?? (variant === 'error' ? 'alert' : undefined)}
      className={cn(
        'flex items-start gap-3 rounded-sm border px-4 py-3 text-sm text-ink',
        variantClasses[variant],
        className,
      )}
    >
      <span aria-hidden="true" className={cn('mt-0.5 shrink-0', iconColorClasses[variant])}>
        {icon ?? <DefaultIcon aria-hidden="true" className="size-5" strokeWidth={2} />}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold text-ink">{title}</p> : null}
        {children ? <div className={cn(title ? 'mt-0.5' : undefined)}>{children}</div> : null}
      </div>
    </div>
  )
}
