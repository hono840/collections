/**
 * Semaphore descriptor — the single UI source of truth for cost-rate status rendering
 * (design-spec §2.4 / §9.3). Each status is quadruple-encoded: colour (fg/bg/solid), icon
 * SHAPE (○/△/⬢/?), and text LABEL — never colour alone (§6.5). Meaning is fixed and must not
 * be inverted: green = low cost rate = 良好, red = high cost rate = 危険.
 *
 * Role rule (must not drift, keeps the verified AA/AAA contrast): text/number = `fg`,
 * band/meter-fill/solid-badge = `solid` (white text), soft tint = `bg`.
 * Reused by StatusDot (atom) and CostRatePill / CostRateMeter / MenuRow / KpiCard (molecules).
 */
import type { LucideIcon } from 'lucide-react'
import { CircleCheck, TriangleAlert, OctagonX, CircleHelp } from 'lucide-react'
import type { AlertStatus } from '@/lib/domain'

export interface SemaphoreDescriptor {
  /** Japanese status word (良好 / 注意 / 危険 / 要確認). */
  label: string
  /** Shape-encoded icon (○ / △ / ⬢ / ?). */
  icon: LucideIcon
  /** Text / number colour utility (verified AAA on white). */
  fg: string
  /** Soft tint background utility. */
  bg: string
  /** Solid fill utility (status band, meter fill, filled badge) — pair with white text. */
  solid: string
  /** Border utility for outlined chips. */
  border: string
}

export const SEMAPHORE: Record<AlertStatus, SemaphoreDescriptor> = {
  good: {
    label: '良好',
    icon: CircleCheck,
    fg: 'text-good-fg',
    bg: 'bg-good-bg',
    solid: 'bg-good-solid',
    border: 'border-good-fg',
  },
  caution: {
    label: '注意',
    icon: TriangleAlert,
    fg: 'text-caution-fg',
    bg: 'bg-caution-bg',
    solid: 'bg-caution-solid',
    border: 'border-caution-fg',
  },
  danger: {
    label: '危険',
    icon: OctagonX,
    fg: 'text-danger-fg',
    bg: 'bg-danger-bg',
    solid: 'bg-danger-solid',
    border: 'border-danger-fg',
  },
  attention: {
    label: '要確認',
    icon: CircleHelp,
    fg: 'text-ink-secondary',
    bg: 'bg-surface-sunken',
    solid: 'bg-ink-muted',
    border: 'border-border-strong',
  },
}
