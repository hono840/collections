'use client'
/**
 * TaxToggle — 税込/税抜 segmented control + rate select (design-spec §4.2 / §8.2). Client.
 * Emits both parts together so a single onChange keeps includesTax and taxRate in sync.
 */
import { cn } from '@/lib/utils/cn'
import { SegmentedControl } from '@/components/atoms/SegmentedControl'
import { Select } from '@/components/atoms/Select'

export interface TaxToggleValue {
  includesTax: boolean
  taxRate: number
}

export interface TaxToggleProps extends TaxToggleValue {
  onChange: (value: TaxToggleValue) => void
  /** Selectable rates (default 10 / 8). */
  rates?: number[]
  ariaLabel?: string
  className?: string
}

type TaxMode = 'in' | 'ex'

export function TaxToggle({ includesTax, taxRate, onChange, rates = [10, 8], ariaLabel = '税設定', className }: TaxToggleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SegmentedControl<TaxMode>
        ariaLabel={ariaLabel}
        options={[
          { value: 'in', label: '税込' },
          { value: 'ex', label: '税抜' },
        ]}
        value={includesTax ? 'in' : 'ex'}
        onChange={(mode) => onChange({ includesTax: mode === 'in', taxRate })}
      />
      <Select
        aria-label="税率"
        options={rates.map((r) => ({ value: String(r), label: `${r}%` }))}
        value={String(taxRate)}
        onChange={(v) => onChange({ includesTax, taxRate: Number(v) })}
        className="w-24"
      />
    </div>
  )
}
