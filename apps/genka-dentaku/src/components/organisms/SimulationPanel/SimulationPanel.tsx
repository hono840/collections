'use client'
/**
 * SimulationPanel — the price-raise simulator bottom sheet (design-spec §4.4 / PRD 4.d).
 * Single mode (Free): pick a 目標原価率, see the recommended sell price (ceilToUnit on the ex-tax
 * value = safe side, incl-tax shown) with a before→after of both rate and price, then 反映 it. Bulk
 * mode (Pro): the same target applied across every menu with a computable cost, previewed then
 * applied in one go; Free users see the non-aggressive UpgradePrompt instead.
 *
 * All figures come from the pure domain functions (recommendedSellExTax → ceilToUnit → simulatedRate),
 * so the numbers match the rest of the app exactly.
 */
import { useMemo, useState } from 'react'
import {
  recommendedSellExTax,
  ceilToUnit,
  simulatedRate,
  ratioToPercent1,
  alertStatus,
  toIncTax,
  roundYen,
  type AlertStatus,
} from '@/lib/domain'
import { formatYen, formatPercent1 } from '@/lib/utils/format'
import { Slider } from '@/components/atoms/Slider'
import { NumberInput } from '@/components/atoms/NumberInput'
import { Button } from '@/components/atoms/Button'
import { SimulationSlider } from '@/components/molecules/SimulationSlider'
import { BeforeAfterStat } from '@/components/molecules/BeforeAfterStat'
import { UpgradePrompt } from '@/components/molecules/UpgradePrompt'
import { Sheet } from '@/components/organisms/Sheet'

export interface SimMenu {
  id: string
  name: string
  /** Full-precision ex-tax cost. null = not computable (attention menu). */
  costExTax: number | null
  sellTaxRate: number
  currentSellIncTax: number | null
  currentRatePercent1: number | null
  currentStatus: AlertStatus
}

interface Recommendation {
  newSellExTax: number
  newSellIncTaxYen: number
  newRatePercent1: number | null
  newStatus: AlertStatus
}

export interface SimulationPanelProps {
  open: boolean
  onClose: () => void
  mode: 'single' | 'bulk'
  isPro: boolean
  roundingUnit: number
  warn: number
  danger: number
  target?: SimMenu
  onApplySingle?: (newSellExTax: number) => void
  menus?: SimMenu[]
  onApplyBulk?: (updates: Array<{ id: string; newSellExTax: number }>) => void
  /** Default target rate (defaults to the warn threshold). */
  defaultTargetRate?: number
  pricingHref?: string
  className?: string
}

export function SimulationPanel({
  open,
  onClose,
  mode,
  isPro,
  roundingUnit,
  warn,
  danger,
  target,
  onApplySingle,
  menus = [],
  onApplyBulk,
  defaultTargetRate,
  pricingHref = '/pricing',
  className,
}: SimulationPanelProps) {
  const [targetRate, setTargetRate] = useState(defaultTargetRate ?? warn)

  // Reset the target rate each time the sheet opens (render-phase reset).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setTargetRate(defaultTargetRate ?? warn)
  }

  const recommend = useMemo(() => {
    return (m: SimMenu): Recommendation | null => {
      if (m.costExTax === null) return null
      const raw = recommendedSellExTax(m.costExTax, targetRate)
      if (raw === null) return null
      const newSellExTax = ceilToUnit(raw, roundingUnit)
      const rate = simulatedRate(m.costExTax, newSellExTax)
      const newRatePercent1 = rate === null ? null : ratioToPercent1(rate)
      return {
        newSellExTax,
        newSellIncTaxYen: roundYen(toIncTax(newSellExTax, m.sellTaxRate)),
        newRatePercent1,
        newStatus: alertStatus(newRatePercent1, warn, danger),
      }
    }
  }, [targetRate, roundingUnit, warn, danger])

  const title = mode === 'bulk' ? '一括値上げシミュレーション' : `値上げシミュレーション${target ? `：${target.name}` : ''}`

  // ── Bulk mode ──
  if (mode === 'bulk') {
    if (!isPro) {
      return (
        <Sheet open={open} onClose={onClose} title={title} className={className}>
          <UpgradePrompt
            title="一括適用はProです"
            description="目標原価率を全メニューへまとめて当てて、推奨売価を一覧で見直せます。"
            pricingHref={pricingHref}
            onDismiss={onClose}
          />
        </Sheet>
      )
    }
    const recs = menus.map((m) => ({ m, rec: recommend(m) }))
    const applicable = recs.filter((r): r is { m: SimMenu; rec: Recommendation } => r.rec !== null)
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        className={className}
        footer={
          <Button
            fullWidth
            disabled={applicable.length === 0}
            onClick={() => onApplyBulk?.(applicable.map((r) => ({ id: r.m.id, newSellExTax: r.rec.newSellExTax })))}
          >
            {applicable.length}件に一括適用
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Slider
                ariaLabel="目標原価率"
                value={targetRate}
                min={1}
                max={100}
                ticks={[warn, danger]}
                valueText={formatPercent1(targetRate)}
                onChange={setTargetRate}
              />
            </div>
            <NumberInput aria-label="目標原価率" value={targetRate} onChange={(v) => setTargetRate(v ?? 0)} unit="%" inputMode="numeric" className="w-24" />
          </div>
          <p className="text-body-sm text-ink-secondary">
            <span className="font-num tabular-nums">{applicable.length}</span>
            件のメニューに適用できます（原価が算出できないメニューは対象外）。
          </p>
          <ul className="flex flex-col gap-3">
            {recs.map(({ m, rec }) => (
              <li key={m.id} className="rounded-md bg-surface p-3 shadow-sm">
                <div className="text-h3 text-ink">{m.name}</div>
                {rec ? (
                  <BeforeAfterStat
                    before={m.currentSellIncTax === null ? '—' : formatYen(roundYen(m.currentSellIncTax))}
                    after={formatYen(rec.newSellIncTaxYen)}
                    beforeStatus={m.currentStatus}
                    afterStatus={rec.newStatus}
                  />
                ) : (
                  <p className="text-body-sm text-ink-muted">原価が算出できないため対象外です</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Sheet>
    )
  }

  // ── Single mode ──
  const rec = target ? recommend(target) : null
  const currentSellYen = target && target.currentSellIncTax !== null ? roundYen(target.currentSellIncTax) : null
  const diff = rec && currentSellYen !== null ? rec.newSellIncTaxYen - currentSellYen : null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      className={className}
      footer={
        <Button fullWidth disabled={!rec} onClick={() => rec && onApplySingle?.(rec.newSellExTax)}>
          この売価を反映
        </Button>
      }
    >
      {target && target.costExTax === null ? (
        <p className="text-body-sm text-ink-secondary">
          このメニューは原価が算出できないため、シミュレーションできません。売価と材料を確認してください。
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <SimulationSlider
            target={targetRate}
            onChange={setTargetRate}
            suggestedPrice={rec ? rec.newSellIncTaxYen : null}
            ticks={[warn, danger]}
          />
          <BeforeAfterStat
            label="原価率"
            before={target?.currentRatePercent1 === null || target === undefined ? '—' : formatPercent1(target.currentRatePercent1)}
            after={rec?.newRatePercent1 == null ? '—' : formatPercent1(rec.newRatePercent1)}
            beforeStatus={target?.currentStatus}
            afterStatus={rec?.newStatus}
          />
          <BeforeAfterStat
            label="売価（税込）"
            before={currentSellYen === null ? '—' : formatYen(currentSellYen)}
            after={rec ? formatYen(rec.newSellIncTaxYen) : '—'}
            delta={diff === null ? undefined : `${diff >= 0 ? '+' : ''}${formatYen(diff)}`}
          />
          {!isPro && (
            <UpgradePrompt
              title="一括適用はProです"
              description="全メニューへまとめて目標原価率を当てられます。"
              pricingHref={pricingHref}
            />
          )}
        </div>
      )}
    </Sheet>
  )
}
