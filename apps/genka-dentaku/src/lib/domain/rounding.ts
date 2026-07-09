/**
 * Display rounding (PRD 0.5 / architecture §5.4). Internal math stays full precision;
 * these are applied only at display time. All rounding lives here so boundary behavior
 * (and the color decision, which uses the rounded percent) stays consistent.
 */

/**
 * FP tolerance so that half-up boundaries survive binary floating-point error
 * (e.g. 0.3325*1000 that materializes as 332.4999…). Much larger than the ~1e-13
 * error at these magnitudes, yet far too small to disturb genuine values.
 */
const EPS = 1e-9

/** Money (yen): non-negative half-up integer. ¥0.5 -> ¥1. */
export function roundYen(value: number): number {
  return Math.floor(value + 0.5 + EPS)
}

/** Cost rate: ratio 0..1 -> percent with 1 decimal, half-up. 0.3325 -> 33.3. */
export function ratioToPercent1(ratio: number): number {
  return Math.floor(ratio * 1000 + 0.5 + EPS) / 10
}

/** Effective unit price: 2 decimals, half-up. */
export function roundUnitPrice2(value: number): number {
  return Math.floor(value * 100 + 0.5 + EPS) / 100
}

/** Simulated recommended sell price: round UP to the yen unit (effective rate stays <= target = safe side). */
export function ceilToUnit(value: number, unit: number): number {
  if (unit <= 0) return value
  // Subtract EPS first so exact multiples are not pushed up by FP overshoot.
  const result = Math.ceil(value / unit - EPS) * unit
  return result === 0 ? 0 : result // normalize -0 (e.g. from value 0) to +0
}
