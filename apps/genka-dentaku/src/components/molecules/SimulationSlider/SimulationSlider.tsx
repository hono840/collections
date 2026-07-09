'use client'
/**
 * SimulationSlider — target cost-rate slider + numeric input + suggested-price readout
 * (design-spec §4.4 / §8.2). Client. The suggested price is computed by the caller (domain
 * `recommendedSellExTax` → `ceilToUnit`) and only displayed here. Threshold ticks default to
 * 30 / 35.
 */
import { cn } from '@/lib/utils/cn'
import { formatYen, formatPercent1 } from '@/lib/utils/format'
import { Slider } from '@/components/atoms/Slider'
import { NumberInput } from '@/components/atoms/NumberInput'
import { ComputedReadout } from '@/components/molecules/ComputedReadout'

export interface SimulationSliderProps {
  /** Target cost rate percent. */
  target: number
  onChange: (target: number) => void
  /** Recommended sell price (yen) computed by the caller. null when not computable. */
  suggestedPrice: number | null
  min?: number
  max?: number
  ticks?: number[]
  className?: string
}

export function SimulationSlider({
  target,
  onChange,
  suggestedPrice,
  min = 1,
  max = 100,
  ticks = [30, 35],
  className,
}: SimulationSliderProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Slider
            ariaLabel="目標原価率"
            value={target}
            min={min}
            max={max}
            ticks={ticks}
            valueText={formatPercent1(target)}
            onChange={onChange}
          />
        </div>
        <NumberInput
          aria-label="目標原価率"
          value={target}
          onChange={(v) => onChange(v ?? 0)}
          unit="%"
          inputMode="numeric"
          className="w-24"
        />
      </div>
      <ComputedReadout label="推奨売価" value={suggestedPrice} formatValue={formatYen} placeholder="—" />
    </div>
  )
}
