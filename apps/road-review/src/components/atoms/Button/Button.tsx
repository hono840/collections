import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'md' | 'sm'

/** React 19: `ref` is a regular prop, so it passes through to the <button>. */
export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows the busy state: aria-busy="true" and the button cannot be pressed. */
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary border-transparent hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-surface-raised text-ink border-line-strong hover:bg-surface-sunken',
  danger: 'bg-danger text-on-danger border-transparent hover:bg-danger-hover',
  ghost: 'bg-transparent text-primary border-transparent hover:bg-primary-subtle',
}

const sizeClasses: Record<ButtonSize, string> = {
  // md: 48px tall, 20px side padding, 16px/700
  md: 'min-h-12 px-5 text-base',
  // sm: 40px visual height; the ::before pseudo element widens the hit area to 44px
  sm: 'min-h-10 px-3.5 text-sm before:absolute before:inset-x-0 before:-inset-y-0.5',
}

// Disabled look (spec 4-1): readable ink-subtle text on surface, not just lowered opacity.
const disabledClasses =
  'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-subtle disabled:hover:bg-surface'

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || loading
  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-sm border font-bold',
        'transition-colors duration-140 ease-standard select-none',
        variantClasses[variant],
        sizeClasses[size],
        disabledClasses,
        className,
      )}
    >
      {children}
    </button>
  )
}
