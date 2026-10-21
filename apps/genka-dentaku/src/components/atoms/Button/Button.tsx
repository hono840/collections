/**
 * Button — primary action control (design-spec §2.2 / §2.8 / §8.1).
 * Server-compatible: it forwards native button props (incl. onClick) so it works in both
 * server-rendered forms and client islands. Filled variants use navy; danger uses the red
 * solid. Min touch target 48px (md) / 44px (sm compact) / 56px (lg). Focus is the global
 * :focus-visible navy outline with offset (globals.css §2.8).
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '../Icon'
import { Spinner } from '../Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed',
  secondary: 'bg-surface text-primary-ink border border-border-strong hover:bg-surface-sunken',
  ghost: 'bg-transparent text-primary-ink hover:bg-primary-subtle',
  danger: 'bg-danger-solid text-white hover:bg-danger-fg',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-[var(--tap-min-compact)] px-3 text-label',
  md: 'min-h-[var(--tap-min)] px-4 text-label',
  lg: 'min-h-[56px] px-5 text-body',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  iconStart?: LucideIcon
  ref?: React.Ref<HTMLButtonElement>
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  iconStart,
  type = 'button',
  disabled,
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" decorative /> : iconStart && <Icon icon={iconStart} size="sm" />}
      {children}
    </button>
  )
}
