'use client'
/**
 * KpiSummary — the navy "instrument panel" at the top of the dashboard (design-spec §4.1 / §8.3).
 * One navy face (§1.3: max one per screen) holds the hero 平均原価率 as a big WHITE tabular number,
 * with status conveyed by the coloured CostRateMeter + CostRatePill (spec §4.1: 「数字は白、状態はピル＋
 * メーターで色付け」). Below sit the white sub-KpiCards: 危険メニュー数 / メニュー数 / 平均粗利.
 * The legend (i) opens the SemaphoreLegend popover.
 */
import { Info } from 'lucide-react'
import { alertStatus, type DashboardKpi } from '@/lib/domain'
import { formatPercent1, formatYen } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { IconButton } from '@/components/atoms/IconButton'
import { KpiCard } from '@/components/molecules/KpiCard'
import { CostRateMeter } from '@/components/molecules/CostRateMeter'
import { CostRatePill } from '@/components/molecules/CostRatePill'

export interface KpiSummaryProps {
  kpi: DashboardKpi
  warn: number
  danger: number
  onOpenLegend?: () => void
  className?: string
}

export function KpiSummary({ kpi, warn, danger, onOpenLegend, className }: KpiSummaryProps) {
  const status = alertStatus(kpi.avgRatePercent1, warn, danger)
  const avgText = kpi.avgRatePercent1 === null ? '—' : formatPercent1(kpi.avgRatePercent1)

  return (
    <section aria-label="サマリー" className={cn('rounded-lg bg-primary p-4 shadow-md', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-label text-primary-onnavy">平均原価率</div>
        {onOpenLegend && (
          <IconButton
            icon={Info}
            label="凡例"
            size="sm"
            onClick={onOpenLegend}
            className="text-primary-onnavy hover:bg-white/10 hover:text-white"
          />
        )}
      </div>

      <div className="mt-1 flex items-end gap-3">
        <span className="text-hero font-num tabular-nums text-white">{avgText}</span>
        <div className="mb-1.5">
          <CostRatePill rate={kpi.avgRatePercent1} status={status} size="sm" />
        </div>
      </div>

      <CostRateMeter rate={kpi.avgRatePercent1} warn={warn} danger={danger} className="mt-3" ariaLabel="平均原価率メーター" />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <KpiCard label="危険メニュー" value={kpi.dangerCount} unit="件" status={kpi.dangerCount > 0 ? 'danger' : undefined} />
        <KpiCard label="メニュー数" value={kpi.menuCount} unit="件" />
        <KpiCard label="平均粗利" value={kpi.avgMarginYen === null ? '—' : formatYen(kpi.avgMarginYen)} />
      </div>
    </section>
  )
}
