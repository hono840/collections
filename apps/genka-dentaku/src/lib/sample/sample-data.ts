/**
 * Onboarding sample data (PRD 10.2 / 裁定7). Deterministic ids + isSample:true so the set can be
 * bulk-cleared. Values are the PRD preset ex-tax amounts, chosen so 唐揚げ定食 lands at ≈24.8% (green)
 * and the wedge demo (鶏もも ¥900→¥1200) crosses into ≈30.9% (yellow). Derived values are never
 * stored here — the sample menu's cost/rate come from the domain functions at render time.
 */
import type { Dimension, Ingredient, Menu } from '../domain/schema'
import { toExTax } from '../domain/tax'

/** Fixed timestamp so seeded samples are deterministic (tests + reproducible onboarding). */
const SAMPLE_TS = '2026-01-01T00:00:00.000Z'

function sampleIngredient(
  id: string,
  name: string,
  priceExTax: number,
  purchaseQuantity: number,
  unit: string,
  dimension: Dimension,
  yieldPercent: number,
): Ingredient {
  return {
    id,
    name,
    purchasePriceExTax: priceExTax,
    inputPrice: priceExTax, // PRD 10.2 values are ex-tax; store as an ex-tax input so the invariant holds
    priceIncludesTax: false,
    taxRate: 8, // ingredient default (裁定6); moot here since priceIncludesTax is false
    purchaseQuantity,
    unit,
    dimension,
    yieldPercent,
    isSample: true,
    createdAt: SAMPLE_TS,
    updatedAt: SAMPLE_TS,
  }
}

/** 7 preset ingredients (PRD 10.2 table). Effective unit prices: 鶏1.00 / キャベツ0.25 / 米0.30 / 油0.40 / 粉0.40 / 味噌0.50 / 卵30. */
export const SAMPLE_INGREDIENTS: Ingredient[] = [
  sampleIngredient('sample-chicken', '鶏もも肉', 900, 1000, 'g', 'weight', 90),
  sampleIngredient('sample-cabbage', 'キャベツ', 200, 1000, 'g', 'weight', 80),
  sampleIngredient('sample-rice', '米', 3000, 10000, 'g', 'weight', 100),
  sampleIngredient('sample-oil', '揚げ油', 400, 1000, 'ml', 'volume', 100),
  sampleIngredient('sample-karaage-ko', '唐揚げ粉', 200, 500, 'g', 'weight', 100),
  sampleIngredient('sample-miso', '味噌', 500, 1000, 'g', 'weight', 100),
  sampleIngredient('sample-egg', '卵', 30, 1, '個', 'count', 100),
]

/** Sample menu 唐揚げ定食 (sell ¥900 incl 10% -> ex-tax 818.18…). Cost ≈¥203 / rate ≈24.8% via the domain engine. */
export const SAMPLE_MENU: Menu = {
  id: 'sample-karaage-teishoku',
  name: '唐揚げ定食',
  sellPriceExTax: toExTax(900, true, 10),
  sellInputPrice: 900,
  sellPriceIncludesTax: true,
  sellTaxRate: 10,
  items: [
    { ingredientId: 'sample-chicken', quantity: 150, unit: 'g' },
    { ingredientId: 'sample-cabbage', quantity: 80, unit: 'g' },
    { ingredientId: 'sample-rice', quantity: 70, unit: 'g' },
    { ingredientId: 'sample-oil', quantity: 15, unit: 'ml' },
    { ingredientId: 'sample-karaage-ko', quantity: 15, unit: 'g' },
  ],
  isSample: true,
  createdAt: SAMPLE_TS,
  updatedAt: SAMPLE_TS,
}

/** Fresh copies of the preset entities to seed into the mutable canonical state (no shared references). */
export function createSampleState(): { ingredients: Ingredient[]; menus: Menu[] } {
  return {
    ingredients: SAMPLE_INGREDIENTS.map((ing) => ({ ...ing })),
    menus: [{ ...SAMPLE_MENU, items: SAMPLE_MENU.items.map((item) => ({ ...item })) }],
  }
}
