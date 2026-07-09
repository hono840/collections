/**
 * CSV export (PRD 4.f — Pro). Excel-JP compatible: UTF-8 with a leading BOM, CRLF line endings,
 * comma-separated, RFC4180 quoting. Values are the display-rounded numbers (rate to 1 decimal,
 * money to yen, unit price to 2 decimals) so the file matches the on-screen figures.
 */
import type { CanonicalState } from '@/lib/domain/schema'
import { effectiveUnitPrice, lineCost } from '@/lib/domain/cost'
import { roundYen, roundUnitPrice2 } from '@/lib/domain/rounding'
import { selectIngredientsById, selectMenuSummary } from '@/lib/domain/selectors'

/** UTF-8 BOM so Excel (JP) opens the file without mojibake. */
export const BOM = '﻿'
const CRLF = '\r\n'

/**
 * CSV formula-injection lead chars (security): a spreadsheet (Excel / Sheets / LibreOffice) will
 * evaluate a cell whose first char is one of these as a formula. `\t` / `\r` are included because
 * some importers strip leading whitespace before the check.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/

/**
 * RFC4180 quoting + CSV formula-injection guard. A field that could be executed as a formula is
 * neutralized by prefixing a single quote — EXCEPT pure numbers, so negative amounts (e.g. a
 * negative 粗利 "-50") and signed values ("+5.5") stay intact. Quoting (comma / quote / CR / LF)
 * is then applied on the guarded value.
 */
function escapeField(value: string): string {
  const guarded = FORMULA_LEAD.test(value) && !/^[+-]?\d/.test(value) ? `'${value}` : value
  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

/** Rows -> CSV text (BOM + CRLF + RFC4180 quoting). */
export function toCsv(rows: string[][]): string {
  return BOM + rows.map((row) => row.map(escapeField).join(',')).join(CRLF)
}

function ratePercentCell(ratePercent1: number | null): string {
  return ratePercent1 === null ? '' : ratePercent1.toFixed(1)
}

/** Menu list CSV (PRD 4.f #2). */
export function buildMenusCsv(state: CanonicalState): string {
  const byId = selectIngredientsById(state)
  const header = ['メニュー名', '売価(税込)', '売価(税抜)', '原価(税抜)', '原価率(%)', '粗利(税抜)', '材料数', '状態']
  const rows = state.menus.map((menu) => {
    const s = selectMenuSummary(menu, byId, state.settings)
    return [
      menu.name,
      s.sellIncTax === null ? '' : String(roundYen(s.sellIncTax)),
      s.sellExTax === null ? '' : String(roundYen(s.sellExTax)),
      s.costYen === null ? '' : String(s.costYen),
      ratePercentCell(s.ratePercent1),
      s.marginExTax === null ? '' : String(roundYen(s.marginExTax)),
      String(menu.items.length),
      s.needsAttention ? '要確認' : '正常',
    ]
  })
  return toCsv([header, ...rows])
}

/** Ingredient master CSV (PRD 4.f #1). */
export function buildIngredientsCsv(state: CanonicalState): string {
  const header = ['食材名', '購入価格(税抜)', '購入量', '単位', '歩留まり率(%)', '有効単価(税抜)', '税率(%)', '入力税区分']
  const rows = state.ingredients.map((ing) => {
    const unitPrice = effectiveUnitPrice(ing)
    return [
      ing.name,
      String(roundYen(ing.purchasePriceExTax)),
      String(ing.purchaseQuantity),
      ing.unit,
      String(ing.yieldPercent),
      unitPrice === null ? '' : roundUnitPrice2(unitPrice).toFixed(2),
      String(ing.taxRate),
      ing.priceIncludesTax ? '税込' : '税抜',
    ]
  })
  return toCsv([header, ...rows])
}

/** Cost breakdown CSV (PRD 4.f #3): one row per recipe line. */
export function buildBreakdownCsv(state: CanonicalState): string {
  const byId = selectIngredientsById(state)
  const header = ['メニュー名', '食材名', '使用量', '単位', '有効単価(税抜)', '金額(税抜)']
  const rows: string[][] = []
  for (const menu of state.menus) {
    for (const item of menu.items) {
      const ing = byId.get(item.ingredientId)
      const unitPrice = ing ? effectiveUnitPrice(ing) : null
      const cost = lineCost(item, ing)
      rows.push([
        menu.name,
        ing ? ing.name : '(不明な食材)',
        String(item.quantity),
        item.unit,
        unitPrice === null ? '' : roundUnitPrice2(unitPrice).toFixed(2),
        cost.ok ? String(roundYen(cost.cost)) : '',
      ])
    }
  }
  return toCsv([header, ...rows])
}
