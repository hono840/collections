'use client'
/**
 * Toggle — on/off switch (design-spec §8.1). Client.
 * A native checkbox with role="switch" for correct semantics (Space toggles, state announced)
 * and a clickable label; the visual track/thumb are decorative peers. A visible focus ring is
 * mirrored onto the track via peer-focus-visible. Min 48px tap row.
 */
import { cn } from '@/lib/utils/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Hide the visible text (label still used as accessible name). */
  labelHidden?: boolean
  disabled?: boolean
  id?: string
  className?: string
}

export function Toggle({ checked, onChange, label, labelHidden = false, disabled = false, id, className }: ToggleProps) {
  return (
    <label
      className={cn(
        'inline-flex min-h-[var(--tap-min)] cursor-pointer items-center gap-3 select-none',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={labelHidden ? label : undefined}
          className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-pill bg-border-strong transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
        />
        <span
          aria-hidden
          className="pointer-events-none relative z-1 ml-0.5 h-6 w-6 rounded-pill bg-surface shadow-sm transition-transform peer-checked:translate-x-5"
        />
      </span>
      {!labelHidden && <span className="text-body">{label}</span>}
    </label>
  )
}
