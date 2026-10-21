/**
 * IconButton — icon-only action with a required accessible name (design-spec §8.1).
 * Server-compatible (forwards native button props). Square, min 48px (or 44px compact) so it
 * meets the touch target minimum (§2.8). The visible glyph is decorative; `label` names it.
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon, type IconSize } from '../Icon'

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger'
export type IconButtonSize = 'sm' | 'md'

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: 'text-ink-secondary hover:bg-primary-subtle',
  secondary: 'bg-surface text-primary-ink border border-border-strong hover:bg-surface-sunken',
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed',
  danger: 'text-danger-fg hover:bg-danger-bg',
}

const BOX: Record<IconButtonSize, string> = {
  sm: 'min-h-[var(--tap-min-compact)] min-w-[var(--tap-min-compact)]',
  md: 'min-h-[var(--tap-min)] min-w-[var(--tap-min)]',
}

const GLYPH: Record<IconButtonSize, IconSize> = { sm: 'sm', md: 'md' }

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: LucideIcon
  /** Required accessible name (Japanese). */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  ref?: React.Ref<HTMLButtonElement>
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  type = 'button',
  disabled,
  className,
  ref,
  ...rest
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        BOX[size],
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={GLYPH[size]} />
    </button>
  )
}
