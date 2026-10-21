import { describe, it, expect } from 'vitest'
import type { CanonicalState, Ingredient, Menu, RecipeItem, Settings } from './schema'
import {
  selectIngredientsById,
  selectMenuSummary,
  selectDashboardMenus,
  selectMenusUsingIngredient,
  selectDashboardKpi,
} from './selectors'

// ── Fixtures: one ¥1.0/g ingredient so cost == grams used ──

function ing(overrides: Partial<Ingredient> & { id: string }): Ingredient {
  return {
    name: overrides.id,
    purchasePriceExTax: 1,
    inputPrice: 1,
    priceIncludesTax: false,
    taxRate: 8,
    purchaseQuantity: 1,
    unit: 'g',
    dimension: 'weight',
    yieldPercent: 100,
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const unitIng = ing({ id: 'u' }) // ¥1.0/g

function menu(id: string, name: string, quantity: number, sellPriceExTax: number, items?: RecipeItem[]): Menu {
  return {
    id,
    name,
    sellPriceExTax,
    sellInputPrice: sellPriceExTax,
    sellPriceIncludesTax: false,
    sellTaxRate: 10,
    items: items ?? [{ ingredientId: 'u', quantity, unit: 'g' }],
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const settings: Settings = {
  alertWarnThreshold: 30,
  alertDangerThreshold: 35,
  defaultIngredientTaxRate: 8,
  defaultSellTaxRate: 10,
  defaultPriceIncludesTax: true,
  simRoundingUnit: 10,
  currency: 'JPY',
}

function state(menus: Menu[], ingredients: Ingredient[] = [unitIng]): CanonicalState {
  return {
    schemaVersion: 1,
    meta: { onboardingDone: false, sampleSeeded: false },
    settings,
    ingredients,
    menus,
    license: { key: null, lastSeenDate: null },
  }
}

describe('selectIngredientsById', () => {
  it('indexes ingredients by id', () => {
    const map = selectIngredientsById(state([]))
    expect(map.get('u')).toBe(unitIng)
    expect(map.size).toBe(1)
  })
})

describe('selectMenuSummary', () => {
  const byId = selectIngredientsById(state([]))

  it('computes a healthy menu (38g / ¥100 -> 38.0% danger, margin ¥62)', () => {
    const s = selectMenuSummary(menu('a', 'A', 38, 100), byId, settings)
    expect(s.costYen).toBe(38)
    expect(s.sellExTax).toBe(100)
    expect(s.sellIncTax).toBeCloseTo(110, 10) // 100 incl 10%
    expect(s.ratePercent1).toBe(38)
    expect(s.marginExTax).toBeCloseTo(62, 10)
    expect(s.status).toBe('danger')
    expect(s.needsAttention).toBe(false)
    expect(s.issues).toEqual([])
  })

  it('sell price 0 -> 要確認 (rate null, attention), cost still computed', () => {
    const s = selectMenuSummary(menu('b', 'B', 38, 0), byId, settings)
    expect(s.ratePercent1).toBeNull()
    expect(s.rate).toBeNull()
    expect(s.sellExTax).toBeNull()
    expect(s.marginExTax).toBeNull()
    expect(s.costYen).toBe(38)
    expect(s.status).toBe('attention')
    expect(s.needsAttention).toBe(true)
  })

  it('missing referenced ingredient -> blocking, cost null, attention', () => {
    const s = selectMenuSummary(menu('c', 'C', 10, 100, [{ ingredientId: 'ghost', quantity: 10, unit: 'g' }]), byId, settings)
    expect(s.costExTax).toBeNull()
    expect(s.ratePercent1).toBeNull()
    expect(s.status).toBe('attention')
    expect(s.needsAttention).toBe(true)
    expect(s.issues).toContain('missing-ingredient')
  })
})

describe('selectDashboardMenus (要確認 first -> rate desc -> name asc)', () => {
  it('orders by cost rate descending regardless of insertion order', () => {
    const menus = [menu('c', 'C', 25, 100), menu('a', 'A', 38, 100), menu('b', 'B', 32, 100)]
    const out = selectDashboardMenus(state(menus)).map((m) => m.menu.name)
    expect(out).toEqual(['A', 'B', 'C'])
  })

  it('breaks ties by name ascending', () => {
    const menus = [menu('banana', 'banana', 30, 100), menu('apple', 'apple', 30, 100)]
    const out = selectDashboardMenus(state(menus)).map((m) => m.menu.name)
    expect(out).toEqual(['apple', 'banana'])
  })

  it('places 要確認 (attention) menus at the very top', () => {
    const menus = [menu('a', 'A', 38, 100), menu('z', 'zzz', 10, 0)] // zzz has no sell price
    const out = selectDashboardMenus(state(menus))
    expect(out[0]?.menu.name).toBe('zzz')
    expect(out[0]?.needsAttention).toBe(true)
    expect(out[1]?.menu.name).toBe('A')
  })

  it('returns an empty list for an empty state', () => {
    expect(selectDashboardMenus(state([]))).toEqual([])
  })
})

describe('selectMenusUsingIngredient', () => {
  it('returns only menus that reference the ingredient', () => {
    const using = menu('a', 'A', 10, 100)
    const notUsing = menu('b', 'B', 10, 100, [{ ingredientId: 'other', quantity: 1, unit: 'g' }])
    const found = selectMenusUsingIngredient(state([using, notUsing]), 'u')
    expect(found.map((m) => m.id)).toEqual(['a'])
    expect(selectMenusUsingIngredient(state([using, notUsing]), 'nobody')).toEqual([])
  })
})

describe('selectDashboardKpi', () => {
  it('aggregates avg rate (excluding null), danger count, menu count, avg margin', () => {
    const menus = [menu('a', 'A', 38, 100), menu('b', 'B', 32, 100), menu('c', 'C', 25, 100)]
    const kpi = selectDashboardKpi(state(menus))
    expect(kpi.menuCount).toBe(3)
    expect(kpi.dangerCount).toBe(1) // only A (38% > 35)
    expect(kpi.avgRatePercent1).toBe(31.7) // (38+32+25)/3
    expect(kpi.avgMarginYen).toBe(68) // (62+68+75)/3 = 68.33 -> 68
  })

  it('excludes null-rate/attention menus from the averages', () => {
    const menus = [menu('a', 'A', 38, 100), menu('b', 'B', 32, 100), menu('c', 'C', 25, 100), menu('x', 'X', 10, 0)]
    const kpi = selectDashboardKpi(state(menus))
    expect(kpi.menuCount).toBe(4)
    expect(kpi.dangerCount).toBe(1)
    expect(kpi.avgRatePercent1).toBe(31.7)
    expect(kpi.avgMarginYen).toBe(68)
  })

  it('null averages when nothing is rateable', () => {
    const kpi = selectDashboardKpi(state([]))
    expect(kpi.menuCount).toBe(0)
    expect(kpi.dangerCount).toBe(0)
    expect(kpi.avgRatePercent1).toBeNull()
    expect(kpi.avgMarginYen).toBeNull()
  })
})
