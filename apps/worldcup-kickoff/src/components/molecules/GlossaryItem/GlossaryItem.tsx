import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils/cn'
import type { TermCategory } from '@/lib/domain'

/** カテゴリ → 日本語ラベル + バッジ色 */
const CATEGORY_META: Record<
  TermCategory,
  { label: string; variant: 'pitch' | 'gold' | 'kickoff' | 'neutral' }
> = {
  rule: { label: 'ルール', variant: 'pitch' },
  position: { label: 'ポジション', variant: 'gold' },
  tournament: { label: '大会', variant: 'kickoff' },
  stat: { label: '記録', variant: 'neutral' },
}

export interface GlossaryItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 用語（例: "オフサイド"） */
  termJa: string
  /** 読み仮名（任意） */
  reading?: string
  /** 解説本文 */
  definitionJa: string
  /** カテゴリ（バッジ表示） */
  category: TermCategory
  /** アンカー用 id（用語じてんの直リンク用） */
  anchorId?: string
}

/**
 * 用語じてんの1エントリ（用語・読み・意味・カテゴリバッジ）。
 * `<dl>`（GlossaryList organism）内で使う想定で、用語=dt / 意味=dd を内包する。
 * Server Component。
 */
export function GlossaryItem({
  termJa,
  reading,
  definitionJa,
  category,
  anchorId,
  className,
  ...props
}: GlossaryItemProps) {
  const meta = CATEGORY_META[category]
  return (
    <Card id={anchorId} className={cn('scroll-mt-20', className)} {...props}>
      <div className="flex items-start justify-between gap-2">
        <dt className="min-w-0">
          <span className="text-base font-bold text-text">{termJa}</span>
          {reading ? (
            <span className="ml-2 text-xs text-text-muted">{reading}</span>
          ) : null}
        </dt>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      <dd className="mt-1.5 text-sm leading-relaxed text-text-muted">
        {definitionJa}
      </dd>
    </Card>
  )
}
