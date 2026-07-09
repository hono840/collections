'use client'
/**
 * ThresholdSetting — 良好/注意 upper-bound inputs with a live colour-band preview
 * (design-spec §6.3 / §8.2). Client. Cross-field validation: 良好上限 must be < 注意上限
 * (mirrors settingsSchema.refine); the message is associated with the 良好 field and both
 * inputs flag invalid. The preview bands update as the thresholds change.
 */
import { cn } from '@/lib/utils/cn'
import { NumberInput } from '@/components/atoms/NumberInput'
import { FormField } from '@/components/molecules/FormField'

const ORDER_MESSAGE = '「良好の上限」は「注意の上限」より小さくしてください'

export interface ThresholdSettingProps {
  warn: number
  danger: number
  onChange: (next: { warn: number; danger: number }) => void
  className?: string
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export function ThresholdSetting({ warn, danger, onChange, className }: ThresholdSettingProps) {
  const invalid = warn >= danger
  const warnPct = clampPct(warn)
  const dangerPct = clampPct(danger)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex gap-3">
        <FormField label="良好の上限" error={invalid ? ORDER_MESSAGE : undefined} className="flex-1">
          {({ id, describedBy, invalid: inv }) => (
            <NumberInput
              id={id}
              aria-describedby={describedBy}
              error={inv}
              value={warn}
              onChange={(v) => onChange({ warn: v ?? 0, danger })}
              unit="%"
              inputMode="numeric"
            />
          )}
        </FormField>
        <FormField label="注意の上限" className="flex-1">
          {({ id, describedBy }) => (
            <NumberInput
              id={id}
              aria-describedby={describedBy}
              error={invalid}
              value={danger}
              onChange={(v) => onChange({ warn, danger: v ?? 0 })}
              unit="%"
              inputMode="numeric"
            />
          )}
        </FormField>
      </div>

      <div
        role="img"
        aria-label={`良好は${warnPct}%まで、注意は${dangerPct}%まで、それ以上は危険`}
        className="flex h-3 w-full overflow-hidden rounded-pill"
      >
        <div className="bg-good-solid" style={{ width: `${warnPct}%` }} />
        <div className="bg-caution-solid" style={{ width: `${Math.max(0, dangerPct - warnPct)}%` }} />
        <div className="flex-1 bg-danger-solid" />
      </div>
    </div>
  )
}
