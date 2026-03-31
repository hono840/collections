'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** ボタンのバリアント */
  variant?: ButtonVariant
  /** ボタンのサイズ */
  size?: ButtonSize
  /** ローディング状態 */
  loading?: boolean
  /** フル幅表示 */
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50',
  secondary:
    'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750',
  ghost:
    'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-700',
  danger:
    'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-2 text-sm',
  md: 'rounded-xl px-4 py-2.5 text-sm',
  lg: 'rounded-xl px-4 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-colors',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
