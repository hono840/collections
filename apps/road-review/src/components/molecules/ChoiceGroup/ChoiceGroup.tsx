'use client'

import { useId, type ReactNode } from 'react'
import { FieldError } from '@/components/atoms/FieldError'
import { cn } from '@/lib/utils/cn'

export type ChoiceOption<T extends string> = { value: T; label: string }

export type ChoiceGroupProps<T extends string> = {
  /** Shared name of the radios (one tab stop; arrow keys move and select). */
  name: string
  legend: ReactNode
  options: ReadonlyArray<ChoiceOption<T>>
  value: T | null
  onChange: (value: T) => void
  required?: boolean
  error?: string
  id?: string
  className?: string
}

/**
 * fieldset + legend + native radios (APG radio group behaviour comes from the browser).
 * Each option is a 44px tall pill; the checked one is filled and also shows a check dot,
 * so the state is not conveyed by color only.
 */
export function ChoiceGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  required = false,
  error,
  id,
  className,
}: ChoiceGroupProps<T>) {
  const generatedId = useId()
  const groupId = id ?? generatedId
  const errorId = `${groupId}-error`

  return (
    <fieldset
      id={groupId}
      aria-describedby={error ? errorId : undefined}
      className={cn('min-w-0', className)}
    >
      <legend className="inline-flex items-center gap-2 text-sm font-bold text-ink">
        {legend}
        {required ? (
          <span className="rounded-full border border-ink-muted px-2 text-xs font-bold text-ink-muted">
            必須
          </span>
        ) : null}
      </legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`
          const checked = value === option.value
          return (
            <div key={option.value} className="relative">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                required={required}
                onChange={() => onChange(option.value)}
                className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
              />
              <label
                htmlFor={optionId}
                className={cn(
                  'pointer-events-none inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold',
                  'transition-colors duration-140 ease-standard',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                  checked
                    ? 'border-primary bg-primary-subtle text-ink'
                    : 'border-line-strong bg-surface-raised text-ink peer-hover:bg-surface-sunken',
                  error && !checked && 'border-danger',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full border-2',
                    checked ? 'border-primary' : 'border-line-strong',
                  )}
                >
                  {checked ? <span className="size-2 rounded-full bg-primary" /> : null}
                </span>
                {option.label}
              </label>
            </div>
          )
        })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  )
}
