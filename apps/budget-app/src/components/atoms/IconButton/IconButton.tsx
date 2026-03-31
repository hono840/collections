'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** ローディング状態 */
  loading?: boolean
  /** ボタンサイズ (px) */
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

const iconSizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { size = 'md', loading = false, disabled, className, children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors',
          'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
          'dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300',
          'disabled:opacity-50',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className={cn('animate-spin', iconSizes[size])} /> : children}
      </button>
    )
  }
)
