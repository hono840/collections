'use client'
/**
 * TextInput — single-line text field (design-spec §2.8 / §8.1). Client (interactive input).
 * Font size is 16px (text-body) to prevent iOS zoom; min height 48px. Error state wires
 * aria-invalid and a danger border. Forwards native input props (value/onChange/ref/…).
 */
import { cn } from '@/lib/utils/cn'

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  ref?: React.Ref<HTMLInputElement>
}

export function TextInput({ error = false, type = 'text', className, ref, ...rest }: TextInputProps) {
  return (
    <input
      ref={ref}
      type={type}
      aria-invalid={error || undefined}
      className={cn(
        'text-body block min-h-[var(--input-min-h)] w-full rounded-md border bg-surface px-3 text-ink',
        'placeholder:text-ink-muted disabled:bg-surface-sunken disabled:opacity-60',
        error ? 'border-danger-fg' : 'border-border-strong',
        className,
      )}
      {...rest}
    />
  )
}
