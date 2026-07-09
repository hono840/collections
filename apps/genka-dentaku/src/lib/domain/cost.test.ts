import { describe, it, expect } from 'vitest'
import type { Ingredient, Menu, RecipeItem } from './schema'
import { effectiveUnitPrice, lineCost, menuCost, costRate, grossMargin } from './cost'

// ── Typed fixture builders (PRD 10.2 preset values) ──

function ing(overrides: Partial<Ingredient> & { id: string }): Ingredient {
  return {
    id: overrides.id,
    name: 'x',
    purchasePriceExTax: 0,
    inputPrice: 0,
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

const chicken = ing({ id: 'chicken', name: '鶏もも肉', purchasePriceExTax: 900, purchaseQuantity: 1000, unit: 'g', dimension: 'weight', yieldPercent: 90 })
const cabbage = ing({ id: 'cabbage', name: 'キャベツ', purchasePriceExTax: 200, purchaseQuantity: 1000, unit: 'g', dimension: 'weight', yieldPercent: 80 })
const rice = ing({ id: 'rice', name: '米', purchasePriceExTax: 3000, purchaseQuantity: 10000, unit: 'g', dimension: 'weight', yieldPercent: 100 })
const oil = ing({ id: 'oil', name: '揚げ油', purchasePriceExTax: 400, purchaseQuantity: 1000, unit: 'ml', dimension: 'volume', yieldPercent: 100 })
const karaageKo = ing({ id: 'karaage-ko', name: '唐揚げ粉', purchasePriceExTax: 200, purchaseQuantity: 500, unit: 'g', dimension: 'weight', yieldPercent: 100 })
const egg = ing({ id: 'egg', name: '卵', purchasePriceExTax: 30, purchaseQuantity: 1, unit: '個', dimension: 'count', yieldPercent: 100 })

const karaageItems: RecipeItem[] = [
  { ingredientId: 'chicken', quantity: 150, unit: 'g' },
  { ingredientId: 'cabbage', quantity: 80, unit: 'g' },
  { ingredientId: 'rice', quantity: 70, unit: 'g' },
  { ingredientId: 'oil', quantity: 15, unit: 'ml' },
  { ingredientId: 'karaage-ko', quantity: 15, unit: 'g' },
]

function menu(items: RecipeItem[], sellPriceExTax = 818.1818181818): Menu {
  return {
    id: 'karaage',
    name: '唐揚げ定食',
    sellPriceExTax,
    sellInputPrice: 900,
    sellPriceIncludesTax: true,
    sellTaxRate: 10,
    items,
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function byId(list: Ingredient[]): Map<string, Ingredient> {
  return new Map(list.map((i) => [i.id, i]))
}

const allKaraageIngredients = [chicken, cabbage, rice, oil, karaageKo]

describe('effectiveUnitPrice', () => {
  it('cabbage = ¥0.25/g (PRD 0.2 worked example)', () => {
    expect(effectiveUnitPrice(cabbage)).toBeCloseTo(0.25, 10)
  })
  it('chicken = ¥1.00/g, rice = ¥0.30/g, oil = ¥0.40/ml', () => {
    expect(effectiveUnitPrice(chicken)).toBeCloseTo(1.0, 10)
    expect(effectiveUnitPrice(rice)).toBeCloseTo(0.3, 10)
    expect(effectiveUnitPrice(oil)).toBeCloseTo(0.4, 10)
  })
  it('yield 100% keeps the raw purchase unit price (¥1000/500g -> ¥2.0/g)', () => {
    expect(effectiveUnitPrice(ing({ id: 'y', purchasePriceExTax: 1000, purchaseQuantity: 500, yieldPercent: 100 }))).toBeCloseTo(2.0, 10)
  })
  it('price 0 is a valid ¥0 unit price (not null, PRD 8.4)', () => {
    expect(effectiveUnitPrice(ing({ id: 'z', purchasePriceExTax: 0 }))).toBe(0)
  })
  it('null-guards zero-division from a corrupt qty/yield', () => {
    expect(effectiveUnitPrice(ing({ id: 'q', purchaseQuantity: 0 }))).toBeNull()
    expect(effectiveUnitPrice(ing({ id: 'w', yieldPercent: 0 }))).toBeNull()
  })
})

describe('lineCost', () => {
  it('computes a normal line (150g of ¥1.0/g chicken = ¥150)', () => {
    expect(lineCost({ ingredientId: 'chicken', quantity: 150, unit: 'g' }, chicken)).toEqual({ ok: true, cost: 150 })
  })
  it('auto-converts compatible units (0.15kg of chicken = ¥150)', () => {
    const r = lineCost({ ingredientId: 'chicken', quantity: 0.15, unit: 'kg' }, chicken)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.cost).toBeCloseTo(150, 10)
  })
  it('allows a zero-quantity line (¥0, PRD 8.10)', () => {
    expect(lineCost({ ingredientId: 'chicken', quantity: 0, unit: 'g' }, chicken)).toEqual({ ok: true, cost: 0 })
  })
  it('missing ingredient -> missing-ingredient', () => {
    expect(lineCost({ ingredientId: 'ghost', quantity: 1, unit: 'g' }, undefined)).toEqual({ ok: false, reason: 'missing-ingredient' })
  })
  it('cross-dimension line -> unit-mismatch', () => {
    expect(lineCost({ ingredientId: 'chicken', quantity: 1, unit: '個' }, chicken)).toEqual({ ok: false, reason: 'unit-mismatch' })
  })
  it('corrupt ingredient (zero-division) -> invalid-ingredient', () => {
    const broken = ing({ id: 'broken', yieldPercent: 0 })
    expect(lineCost({ ingredientId: 'broken', quantity: 1, unit: 'g' }, broken)).toEqual({ ok: false, reason: 'invalid-ingredient' })
  })
})

describe('menuCost (full-precision sum, skip + record issues)', () => {
  it('唐揚げ定食 total = ¥203 with no issues (PRD 10.2 regression)', () => {
    const mc = menuCost(menu(karaageItems), byId(allKaraageIngredients))
    expect(mc.total).toBeCloseTo(203, 10)
    expect(mc.hasBlockingIssue).toBe(false)
    expect(mc.issues).toEqual([])
    expect(mc.lines).toHaveLength(5)
  })
  it('skips an orphaned line and records the issue without mis-summing (PRD 8.6)', () => {
    // Chicken (¥150 line) removed from the lookup.
    const mc = menuCost(menu(karaageItems), byId([cabbage, rice, oil, karaageKo]))
    expect(mc.total).toBeCloseTo(53, 10) // 203 - 150
    expect(mc.hasBlockingIssue).toBe(true)
    expect(mc.issues).toContain('missing-ingredient')
    const orphan = mc.lines.find((l) => l.item.ingredientId === 'chicken')
    expect(orphan?.cost).toBeNull()
    expect(orphan?.issue).toBe('missing-ingredient')
  })
  it('records unit-mismatch issues from incompatible lines', () => {
    const mc = menuCost(menu([{ ingredientId: 'egg', quantity: 1, unit: 'g' }]), byId([egg]))
    expect(mc.hasBlockingIssue).toBe(true)
    expect(mc.issues).toContain('unit-mismatch')
  })
})

describe('costRate / grossMargin', () => {
  it('原価率 = 203 / 818.18 ≈ 0.248 (PRD 4.b regression)', () => {
    const rate = costRate(203, 818.1818181818)
    expect(rate).not.toBeNull()
    expect(rate as number).toBeCloseTo(0.2481, 4)
  })
  it('null when sell price <= 0 (PRD 8.5)', () => {
    expect(costRate(203, 0)).toBeNull()
    expect(costRate(203, -5)).toBeNull()
  })
  it('粗利 = sell - cost ≈ ¥615 (PRD 4.b regression)', () => {
    expect(grossMargin(203, 818.1818181818)).toBeCloseTo(615.18, 2)
  })
})
