'use client'
/**
 * NumberStepper — NumberInput flanked by −/+ IconButtons (design-spec §4.3 / §8.2). Client.
 * Steps clamp to min/max and disable the button at the bound. Null is treated as 0 for stepping.
 */
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { NumberInput } from '@/components/atoms/NumberInput'
import { IconButton } from '@/components/atoms/IconButton'

export interface NumberStepperProps {
  value: number | null
  onChange: (value: number | null) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  ariaLabel?: string
  id?: string
  error?: boolean
  className?: string
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  ariaLabel,
  id,
  error,
  className,
}: NumberStepperProps) {
  const base = value ?? 0

  function clamp(n: number): number {
    let r = n
    if (min !== undefined) r = Math.max(min, r)
    if (max !== undefined) r = Math.min(max, r)
    return r
  }

  const decDisabled = min !== undefined && base <= min
  const incDisabled = max !== undefined && base >= max

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <IconButton
        icon={Minus}
        label="減らす"
        variant="secondary"
        onClick={() => onChange(clamp(base - step))}
        disabled={decDisabled}
      />
      <NumberInput
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        unit={unit}
        error={error}
        min={min}
        max={max}
        step={step}
        className="w-24"
      />
      <IconButton
        icon={Plus}
        label="増やす"
        variant="secondary"
        onClick={() => onChange(clamp(base + step))}
        disabled={incDisabled}
      />
    </div>
  )
}
