/**
 * Consumption-tax helpers (PRD 0.3). The single write-path for ex-tax normalization is
 * `toExTax`, keeping inputPrice and *ExTax fields from drifting (architecture §3 / §14).
 * Full precision — rounding happens only at display time (PRD 0.5).
 */

/** Tax-inclusive input -> ex-tax; ex-tax input passes through unchanged. */
export function toExTax(inputPrice: number, includesTax: boolean, taxRate: number): number {
  return includesTax ? inputPrice / (1 + taxRate / 100) : inputPrice
}

/** Ex-tax -> tax-inclusive (for the sell price co-display, PRD 0.3). */
export function toIncTax(exTax: number, taxRate: number): number {
  return exTax * (1 + taxRate / 100)
}
