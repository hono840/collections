'use client'
/**
 * LiveCostSummary — the navy instrument panel pinned to the bottom of the recipe editor
 * (design-spec §4.3 / §8.3). Shows the hero 原価率 (white tabular number) + coloured CostRateMeter +
 * CostRatePill, plus 原価 / 粗利, and the 値上げをシミュレーション entry. Values are derived by the
 * parent from CanonicalState and update live on every edit (THE WEDGE): when the rate crosses a
 * threshold, the meter + pill colour + status word switch together (not colour-only).
 */
import { TrendingUp } from 'lucide-react'
import type { AlertStatus } from '@/lib/domain'
import { formatYen } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/atoms/Button'
import { CostRateMeter } from '@/components/molecules/CostRateMeter'
import { CostRatePill } from '@/components/molecules/CostRatePill'

export interface LiveCostSummaryProps {
  /** Cost (yen, display-rounded). null = not computable (no/blocked materials). */
  costYen: number | null
  /** Cost rate percent, 1 decimal. null = not computable (no cost / no sell price). */
  ratePercent1: number | null
  /** Gross margin (yen, display-rounded). */
  marginYen: number | null
  status: AlertStatus
  warn: number
  danger: number
  onSimulate?: () => void
  className?: string
}

export function LiveCostSummary({
  costYen,
  ratePercent1,
  marginYen,
  status,
  warn,
  danger,
  onSimulate,
  className,
}: LiveCostSummaryProps) {
  const rateText = ratePercent1 === null ? '—' : `${ratePercent1.toFixed(1)}%`
  // Explain WHY the rate is blank (design-spec §4.3 empty/error states).
  const hint = ratePercent1 !== null ? null : costYen === null ? '材料を追加すると計算されます' : '売価を入力してください'

  return (
    <section aria-label="原価サマリー" className={cn('rounded-lg bg-primary p-4 shadow-md', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-label text-primary-onnavy">原価率</div>
          <div className="text-hero font-num tabular-nums text-white">{rateText}</div>
        </div>
        {hint ? (
          <p className="text-body-sm mb-1.5 max-w-[10rem] text-right text-primary-onnavy">{hint}</p>
        ) : (
          <div className="mb-1.5">
            <CostRatePill rate={ratePercent1} status={status} size="sm" />
          </div>
        )}
      </div>

      <CostRateMeter rate={ratePercent1} warn={warn} danger={danger} className="mt-3" ariaLabel="原価率メーター" />

      <div className="mt-3 flex gap-6">
        <div>
          <div className="text-caption text-primary-onnavy">原価</div>
          <div className="text-metric font-num tabular-nums text-white">{costYen === null ? '—' : formatYen(costYen)}</div>
        </div>
        <div>
          <div className="text-caption text-primary-onnavy">粗利</div>
          <div className="text-metric font-num tabular-nums text-white">{marginYen === null ? '—' : formatYen(marginYen)}</div>
        </div>
      </div>

      {onSimulate && (
        <Button
          variant="secondary"
          fullWidth
          iconStart={TrendingUp}
          onClick={onSimulate}
          disabled={costYen === null}
          className="mt-4"
        >
          値上げをシミュレーション
        </Button>
      )}
    </section>
  )
}
