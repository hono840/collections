'use client'
/**
 * PlanToggle — 月額 / 年額 billing segmented control + 「2ヶ月分お得」 badge (design-spec §4.5 / §8.2).
 * Client. 年額 is the recommended default (set by the caller's initial `cycle`); the saving badge
 * sits alongside per the CPO ruling.
 */
import { cn } from '@/lib/utils/cn'
import { SegmentedControl } from '@/components/atoms/SegmentedControl'
import { Badge } from '@/components/atoms/Badge'

export type BillingCycle = 'monthly' | 'annual'

export interface PlanToggleProps {
  cycle: BillingCycle
  onChange: (cycle: BillingCycle) => void
  savingLabel?: string
  className?: string
}

export function PlanToggle({ cycle, onChange, savingLabel = '2ヶ月分お得', className }: PlanToggleProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <SegmentedControl<BillingCycle>
        ariaLabel="請求サイクル"
        options={[
          { value: 'monthly', label: '月額' },
          { value: 'annual', label: '年額' },
        ]}
        value={cycle}
        onChange={onChange}
      />
      <Badge tone="info">{savingLabel}</Badge>
    </div>
  )
}
