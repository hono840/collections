import { describe, it, expect } from 'vitest'
import type { Ingredient, Settings } from '../domain/schema'
import { selectMenuSummary } from '../domain/selectors'
import { SAMPLE_INGREDIENTS, SAMPLE_MENU, createSampleState } from './sample-data'

const settings: Settings = {
  alertWarnThreshold: 30,
  alertDangerThreshold: 35,
  defaultIngredientTaxRate: 8,
  defaultSellTaxRate: 10,
  defaultPriceIncludesTax: true,
  simRoundingUnit: 10,
  currency: 'JPY',
}

function byId(list: Ingredient[]): Map<string, Ingredient> {
  return new Map(list.map((i) => [i.id, i]))
}

describe('createSampleState', () => {
  it('returns the 7 preset ingredients + 唐揚げ定食, all flagged isSample with deterministic ids', () => {
    const seed = createSampleState()
    expect(seed.ingredients).toHaveLength(7)
    expect(seed.menus).toHaveLength(1)
    expect(seed.ingredients.every((i) => i.isSample)).toBe(true)
    expect(seed.menus.every((m) => m.isSample)).toBe(true)
    expect(seed.ingredients.map((i) => i.id)).toContain('sample-chicken')
    expect(seed.menus[0]?.id).toBe('sample-karaage-teishoku')
  })

  it('keeps the tax-normalization invariant (chicken ex-tax matches its input)', () => {
    const chicken = createSampleState().ingredients.find((i) => i.id === 'sample-chicken')
    expect(chicken?.purchasePriceExTax).toBe(900)
  })
})

describe('唐揚げ定食 integration regression (PRD 10.2 via domain functions)', () => {
  it('computes 原価¥203 / 原価率24.8% (緑) / 粗利¥615', () => {
    const summary = selectMenuSummary(SAMPLE_MENU, byId(SAMPLE_INGREDIENTS), settings)
    expect(summary.costYen).toBe(203)
    expect(summary.ratePercent1).toBe(24.8)
    expect(summary.status).toBe('good')
    expect(summary.marginExTax).toBeCloseTo(615.18, 1)
    expect(summary.sellIncTax).toBeCloseTo(900, 6) // stored ex-tax 818.18 -> incl 10% = 900
    expect(summary.needsAttention).toBe(false)
  })

  it('wedge: 鶏もも肉 ¥900 -> ¥1200 recomputes 原価率 to 30.9% (黄・注意)', () => {
    const bumped = SAMPLE_INGREDIENTS.map((i) =>
      i.id === 'sample-chicken' ? { ...i, purchasePriceExTax: 1200, inputPrice: 1200 } : i,
    )
    const summary = selectMenuSummary(SAMPLE_MENU, byId(bumped), settings)
    expect(summary.ratePercent1).toBe(30.9)
    expect(summary.status).toBe('caution')
  })
})
