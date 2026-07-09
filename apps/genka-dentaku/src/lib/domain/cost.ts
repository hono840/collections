/**
 * Cost engine (PRD 0.2 / architecture §5.2). All full precision — rounding is a display concern.
 * Never mis-attributes cost: unresolvable lines are recorded as issues and excluded from the total
 * so a menu with a dangling/incompatible line becomes 要確認 rather than silently wrong (PRD 8.6).
 */
import type { Ingredient, Menu, RecipeItem } from './schema'
import { convertQuantity } from './units'

export type LineIssue = 'missing-ingredient' | 'unit-mismatch' | 'invalid-ingredient'
export type LineCost = { ok: true; cost: number } | { ok: false; reason: LineIssue }

/**
 * Effective unit price (ex-tax, yen per purchase unit) = purchasePriceExTax / (purchaseQuantity × yield/100).
 * Zero/negative denominator -> null (zero-division guard). A ¥0 price is a valid ¥0 result (PRD 8.4).
 */
export function effectiveUnitPrice(ing: Ingredient): number | null {
  const usableQuantity = ing.purchaseQuantity * (ing.yieldPercent / 100)
  if (!(usableQuantity > 0)) return null
  return ing.purchasePriceExTax / usableQuantity
}

/** Cost of one recipe line (ex-tax, full precision). Missing/incompatible/corrupt -> ok:false. */
export function lineCost(item: RecipeItem, ing: Ingredient | undefined): LineCost {
  if (ing === undefined) return { ok: false, reason: 'missing-ingredient' }
  const unitPrice = effectiveUnitPrice(ing)
  if (unitPrice === null) return { ok: false, reason: 'invalid-ingredient' }
  const quantity = convertQuantity(item.quantity, item.unit, ing.unit, ing.dimension)
  if (quantity === null) return { ok: false, reason: 'unit-mismatch' }
  return { ok: true, cost: unitPrice * quantity }
}

export interface MenuCost {
  total: number // ex-tax, full precision (each line summed at full precision; never rounded per line)
  lines: Array<{ item: RecipeItem; cost: number | null; issue?: LineIssue }>
  issues: LineIssue[]
  hasBlockingIssue: boolean // any unresolved line -> cost is 要確認
}

/** Aggregate menu cost (ex-tax). Orphaned lines are skipped and recorded (PRD 8.6). */
export function menuCost(menu: Menu, ingredientsById: Map<string, Ingredient>): MenuCost {
  const lines: MenuCost['lines'] = []
  const issues: LineIssue[] = []
  let total = 0

  for (const item of menu.items) {
    const result = lineCost(item, ingredientsById.get(item.ingredientId))
    if (result.ok) {
      total += result.cost
      lines.push({ item, cost: result.cost })
    } else {
      if (!issues.includes(result.reason)) issues.push(result.reason)
      lines.push({ item, cost: null, issue: result.reason })
    }
  }

  return { total, lines, issues, hasBlockingIssue: issues.length > 0 }
}

/** Cost rate (0..1). Sell price <= 0 -> null (「—」表示, PRD 8.5). = costExTax / sellExTax. */
export function costRate(costExTax: number, sellExTax: number): number | null {
  if (!(sellExTax > 0)) return null
  return costExTax / sellExTax
}

/** Gross margin (ex-tax, yen) = sellExTax - costExTax. */
export function grossMargin(costExTax: number, sellExTax: number): number {
  return sellExTax - costExTax
}
