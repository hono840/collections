'use client'
/**
 * UnitSelect — grouped unit picker with optional free entry (design-spec §4.2 / §8.1). Client.
 * Native <select> grouped 重量 (g/kg) / 容量 (ml/L) / 個数 (presets); with `allowCustom` a
 * final 「その他（自由入力）」 option reveals a free-text field for count-style units. Stateless:
 * a non-preset value implies custom mode, so it stays in sync with the controlled `value`.
 * Callers derive the dimension via domain `dimensionOf(unit)`.
 */
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { WEIGHT_UNITS, VOLUME_UNITS, COUNT_UNIT_PRESETS } from '@/lib/constants/units'
import { Icon } from '../Icon'
import { TextInput } from '../TextInput'

const CUSTOM = '__custom__'
const ALL_PRESETS: readonly string[] = [...WEIGHT_UNITS, ...VOLUME_UNITS, ...COUNT_UNIT_PRESETS]

export interface UnitSelectProps {
  value: string
  onChange: (unit: string) => void
  allowCustom?: boolean
  error?: boolean
  id?: string
  ariaLabel?: string
  className?: string
}

export function UnitSelect({
  value,
  onChange,
  allowCustom = false,
  error = false,
  id,
  ariaLabel = '単位',
  className,
}: UnitSelectProps) {
  const isPreset = ALL_PRESETS.includes(value)
  const showCustom = allowCustom && !isPreset
  const selectValue = isPreset ? value : allowCustom ? CUSTOM : value

  function handleSelect(v: string) {
    if (v === CUSTOM) {
      onChange('') // clear so the free-text field starts empty
      return
    }
    onChange(v)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative flex items-center">
        <select
          id={id}
          aria-label={ariaLabel}
          aria-invalid={error || undefined}
          value={selectValue}
          onChange={(e) => handleSelect(e.target.value)}
          className={cn(
            'text-body block min-h-[var(--input-min-h)] w-full appearance-none rounded-md border bg-surface pr-10 pl-3 text-ink',
            error ? 'border-danger-fg' : 'border-border-strong',
          )}
        >
          <optgroup label="重量">
            {WEIGHT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </optgroup>
          <optgroup label="容量">
            {VOLUME_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </optgroup>
          <optgroup label="個数">
            {COUNT_UNIT_PRESETS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </optgroup>
          {allowCustom && <option value={CUSTOM}>その他（自由入力）</option>}
        </select>
        <span className="pointer-events-none absolute right-3 text-ink-muted">
          <Icon icon={ChevronDown} size="sm" />
        </span>
      </div>
      {showCustom && (
        <TextInput
          aria-label="単位（自由入力）"
          value={value}
          error={error}
          onChange={(e) => onChange(e.target.value)}
          placeholder="単位を入力（例: 房）"
        />
      )}
    </div>
  )
}
