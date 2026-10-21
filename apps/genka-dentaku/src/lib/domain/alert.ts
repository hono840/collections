/**
 * Cost-rate signal color (PRD 0.6 / architecture §5.5).
 * The judgement runs on the already-rounded 1-decimal percent so the color always matches the
 * displayed number (e.g. with danger=35: 35.0 -> caution, 35.1 -> danger).
 */
export type AlertStatus = 'good' | 'caution' | 'danger' | 'attention' // attention = 要確認

/**
 * good: rate < warn / caution: warn <= rate <= danger / danger: rate > danger.
 * null rate (sell unset or blocking material issue) -> attention.
 */
export function alertStatus(ratePercent1: number | null, warn: number, danger: number): AlertStatus {
  if (ratePercent1 === null) return 'attention'
  if (ratePercent1 < warn) return 'good'
  if (ratePercent1 <= danger) return 'caution'
  return 'danger'
}
