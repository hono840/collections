/**
 * Badge — small non-interactive label (design-spec §8.1). Server-compatible.
 * Tones: neutral (サンプル), info (お得 等の強調), pro (ゴールドの "PRO" 記号・§2.3).
 * Gold is decoration-only and used at label scale (AA via pro-ink), never for status fills.
 */
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '../Icon'

export type BadgeTone = 'neutral' | 'info' | 'pro'

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-secondary',
  info: 'bg-primary-subtle text-primary-ink',
  pro: 'bg-pro-subtle text-pro-ink',
}

export interface BadgeProps {
  tone?: BadgeTone
  iconStart?: LucideIcon
  children: React.ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', iconStart, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-caption inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-medium whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {iconStart && <Icon icon={iconStart} size="xs" />}
      {children}
    </span>
  )
}
