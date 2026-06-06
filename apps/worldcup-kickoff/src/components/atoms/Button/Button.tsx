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
  /** ローディング状態（disabled かつスピナー表示） */
  loading?: boolean
  /** フル幅表示 */
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-pitch-600 text-white hover:bg-pitch-700 disabled:opacity-50',
  secondary:
    'border border-border bg-surface text-text hover:bg-pitch-50 disabled:opacity-50',
  ghost: 'text-text-muted hover:bg-pitch-50 hover:text-text disabled:opacity-50',
  danger: 'bg-kickoff-500 text-white hover:bg-kickoff-600 disabled:opacity-50',
}

// タップ領域 44px 以上を min-h で保証（モバイル A11y）
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-11 rounded-xl px-4 py-2 text-sm',
  md: 'min-h-11 rounded-xl px-5 py-2.5 text-sm',
  lg: 'min-h-12 rounded-2xl px-6 py-3 text-base',
}

/**
 * 汎用ボタン。デザイン言語（丸み・44px 以上タップ領域・ピッチグリーン）準拠。
 */
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
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    )
  },
)
