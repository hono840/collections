'use client'
/**
 * Checkbox — labelled boolean (design-spec §8.1). Client.
 * A native checkbox (visually hidden) with a decorative box + check peer, so the label is
 * clickable and the control keeps native keyboard/AT behaviour. Focus ring mirrored onto the
 * box via peer-focus-visible. Min 48px tap row.
 */
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'checked'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  labelHidden?: boolean
  ref?: React.Ref<HTMLInputElement>
}

export function Checkbox({ checked, onChange, label, labelHidden = false, className, ref, ...rest }: CheckboxProps) {
  return (
    <label
      className={cn('inline-flex min-h-[var(--tap-min)] cursor-pointer items-center gap-2 select-none', className)}
    >
      <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={labelHidden ? label : undefined}
          className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
          {...rest}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-sm border border-border-strong bg-surface transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
        />
        <Check aria-hidden size={16} className="pointer-events-none relative z-1 text-white opacity-0 peer-checked:opacity-100" />
      </span>
      {!labelHidden && <span className="text-body">{label}</span>}
    </label>
  )
}
