/**
 * Derived selectors (state × domain, architecture §5.5). Pure — the use-* hooks call these
 * inside useMemo. Nothing here is persisted; every value is recomputed from CanonicalState,
 * which is what structurally guarantees THE WEDGE (edit one price -> every dependent menu updates).
 */
import type { CanonicalState, Ingredient, Menu, Settings } from './schema'
import { menuCost, costRate, grossMargin, type LineIssue } from './cost'
import { toIncTax } from './tax'
import { roundYen, ratioToPercent1 } from './rounding'
import { alertStatus, type AlertStatus } from './alert'

export interface MenuSummary {
  menu: Menu
  costExTax: number | null // full precision
  costYen: number | null // roundYen applied
  sellExTax: number | null
  sellIncTax: number | null
  rate: number | null // 0..1
  ratePercent1: number | null // 1 decimal (used for the color decision)
  marginExTax: number | null
  status: AlertStatus
  issues: LineIssue[]
  needsAttention: boolean // sell unset/0 OR a blocking material issue
}

/** Index ingredients by id for O(1) lookup during cost aggregation. */
export function selectIngredientsById(state: CanonicalState): Map<string, Ingredient> {
  return new Map(state.ingredients.map((i) => [i.id, i]))
}

/** Full derived summary for a single menu (never persisted). */
export function selectMenuSummary(menu: Menu, byId: Map<string, Ingredient>, settings: Settings): MenuSummary {
  const mc = menuCost(menu, byId)
  const costExTax = mc.hasBlockingIssue ? null : mc.total
  const sellExTax = menu.sellPriceExTax > 0 ? menu.sellPriceExTax : null

  const rate = costExTax !== null && sellExTax !== null ? costRate(costExTax, sellExTax) : null
  const ratePercent1 = rate !== null ? ratioToPercent1(rate) : null
  const marginExTax = costExTax !== null && sellExTax !== null ? grossMargin(costExTax, sellExTax) : null
  const needsAttention = sellExTax === null || mc.hasBlockingIssue

  return {
    menu,
    costExTax,
    costYen: costExTax !== null ? roundYen(costExTax) : null,
    sellExTax,
    sellIncTax: sellExTax !== null ? toIncTax(sellExTax, menu.sellTaxRate) : null,
    rate,
    ratePercent1,
    marginExTax,
    status: alertStatus(ratePercent1, settings.alertWarnThreshold, settings.alertDangerThreshold),
    issues: mc.issues,
    needsAttention,
  }
}

/** Dashboard order: 要確認 first -> cost rate descending (worst first) -> name ascending (PRD 4.e). */
export function selectDashboardMenus(state: CanonicalState): MenuSummary[] {
  const byId = selectIngredientsById(state)
  return state.menus.map((m) => selectMenuSummary(m, byId, state.settings)).sort(compareMenuSummary)
}

function compareMenuSummary(a: MenuSummary, b: MenuSummary): number {
  if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1
  if (!a.needsAttention && !b.needsAttention) {
    const ra = a.ratePercent1 ?? 0
    const rb = b.ratePercent1 ?? 0
    if (rb !== ra) return rb - ra // rate descending
  }
  return a.menu.name.localeCompare(b.menu.name, 'ja') // name ascending
}

/** Menus that reference a given ingredient (for the delete-confirmation count, PRD 8.6). */
export function selectMenusUsingIngredient(state: CanonicalState, ingredientId: string): Menu[] {
  return state.menus.filter((m) => m.items.some((item) => item.ingredientId === ingredientId))
}

export interface DashboardKpi {
  avgRatePercent1: number | null // average over rateable menus (null-rate excluded)
  dangerCount: number
  menuCount: number
  avgMarginYen: number | null
}

/** Dashboard KPI roll-up. Averages exclude 要確認/null-rate menus. */
export function selectDashboardKpi(state: CanonicalState): DashboardKpi {
  const byId = selectIngredientsById(state)
  const summaries = state.menus.map((m) => selectMenuSummary(m, byId, state.settings))

  const rates = summaries.map((s) => s.rate).filter((r): r is number => r !== null)
  const margins = summaries.map((s) => s.marginExTax).filter((m): m is number => m !== null)

  return {
    avgRatePercent1: rates.length > 0 ? ratioToPercent1(sum(rates) / rates.length) : null,
    dangerCount: summaries.filter((s) => s.status === 'danger').length,
    menuCount: state.menus.length,
    avgMarginYen: margins.length > 0 ? roundYen(sum(margins) / margins.length) : null,
  }
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}
