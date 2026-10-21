/**
 * Price-raise simulation (PRD 0.5 / 4.d / 裁定3, architecture §5.3).
 * Apply flow: recommendedSellExTax -> ceilToUnit(simRoundingUnit) -> re-display incl-tax and the
 * effective rate via simulatedRate. Ceiling keeps the effective rate <= target (safe side).
 */

/** Recommended sell price (ex-tax, full precision) from a target rate r% (0<r). Non-positive cost/target -> null. */
export function recommendedSellExTax(costExTax: number, targetRatePercent: number): number | null {
  if (!(costExTax > 0)) return null
  if (!(targetRatePercent > 0)) return null
  return costExTax / (targetRatePercent / 100)
}

/** Cost rate (0..1) at a new sell price. Sell price <= 0 -> null. */
export function simulatedRate(costExTax: number, newSellExTax: number): number | null {
  if (!(newSellExTax > 0)) return null
  return costExTax / newSellExTax
}
