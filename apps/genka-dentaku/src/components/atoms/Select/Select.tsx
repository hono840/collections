'use client'
/**
 * Select — native single select with a chevron affordance (design-spec §8.1). Client.
 * Native <select> for built-in a11y and mobile pickers; 48px min height, 16px font.
 */
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '../Icon'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  error?: boolean
  /** Optional leading placeholder option (disabled, empty value). */
  placeholder?: string
  ref?: React.Ref<HTMLSelectElement>
}

export function Select({
  options,
  value,
  onChange,
  error = false,
  placeholder,
  className,
  ref,
  ...rest
}: SelectProps) {
  return (
    <div className="relative flex items-center">
      <select
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || undefined}
        className={cn(
          'text-body block min-h-[var(--input-min-h)] w-full appearance-none rounded-md border bg-surface pr-10 pl-3 text-ink',
          'disabled:bg-surface-sunken disabled:opacity-60',
          error ? 'border-danger-fg' : 'border-border-strong',
          className,
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-ink-muted">
        <Icon icon={ChevronDown} size="sm" />
      </span>
    </div>
  )
}
