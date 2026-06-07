import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/atoms/Card'
import {
  TIER_DISCLAIMER_JA,
  TIER_META,
  TIER_ORDER,
} from '@/lib/constants/tiers'
import { cn } from '@/lib/utils/cn'

export interface TierLegendProps {
  className?: string
}

/**
 * ランク（tier）の凡例。優勝候補 → ダークホース → チャレンジャーの順に、
 * バッジ・意味（summaryJa）・基準（criteriaJa）を1行ずつ並べ、最後に注記を添える。
 *
 * 文言・配色は `@/lib/constants/tiers` の単一定義（TIER_META 等）を参照し、
 * バッジに使う国図鑑側の表記と必ず一致させる。
 * 表示専用のため Server Component（'use client' 不要）。見出しは呼び出し側が付ける。
 */
export function TierLegend({ className }: TierLegendProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ul className="flex flex-col gap-2">
        {TIER_ORDER.map((tier) => {
          const meta = TIER_META[tier]
          return (
            <li key={tier}>
              <Card padding="md" className="flex flex-col gap-1.5">
                <Badge variant={meta.variant} className="self-start">
                  {meta.label}
                </Badge>
                <p className="text-sm font-bold text-text">{meta.summaryJa}</p>
                <p className="text-xs leading-relaxed text-text-muted">
                  {meta.criteriaJa}
                </p>
              </Card>
            </li>
          )
        })}
      </ul>
      <p className="text-xs leading-relaxed text-text-muted">
        {TIER_DISCLAIMER_JA}
      </p>
    </div>
  )
}
