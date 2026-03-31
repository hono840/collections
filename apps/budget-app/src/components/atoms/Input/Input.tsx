'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** ラベルテキスト */
  label?: string
  /** エラーメッセージ */
  error?: string
  /** HTMLのid属性（labelと紐付け） */
  id?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, id, className, ...props }, ref) {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition-colors',
            'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            'dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)
