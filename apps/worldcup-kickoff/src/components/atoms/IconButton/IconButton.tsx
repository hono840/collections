'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export type IconButtonVariant = 'solid' | 'ghost' | 'outline'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** スクリーンリーダー向けラベル（アイコンのみのため必須） */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** lucide アイコン等の子要素 */
  children: React.ReactNode
}

const variantStyles: Record<IconButtonVariant, string> = {
  solid: 'bg-pitch-600 text-white hover:bg-pitch-700',
  ghost: 'text-text-muted hover:bg-pitch-50 hover:text-text',
  outline: 'border border-border bg-surface text-text hover:bg-pitch-50',
}

// 全サイズでタップ領域 44px 以上を保証
const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-11 w-11 rounded-xl',
  md: 'h-11 w-11 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
}

/**
 * アイコン専用ボタン。`label`（aria-label）必須でアクセシブル。
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      variant = 'ghost',
      size = 'md',
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
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  },
)
