/**
 * FaqAccordion — FAQ 開閉リスト（design-spec §4.6 / §8.3, PRD 11.5）。
 * Server Component。ネイティブ <details>/<summary> を用いるため JS ゼロで動作し、
 * キーボード操作（Enter/Space での開閉・フォーカス）もブラウザ標準で担保される（§6.5）。
 * 回答は閉じていても DOM に存在するため、そのまま SEO 本文として index される。
 */
import { ChevronDown } from 'lucide-react'
import type { FaqItem } from '@/lib/content/faq'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'

export interface FaqAccordionProps {
  items: FaqItem[]
  className?: string
}

export function FaqAccordion({ items, className }: FaqAccordionProps) {
  return (
    <div className={cn('divide-y divide-border border-y border-border', className)}>
      {items.map((item) => (
        <details key={item.id} className="group">
          <summary className="flex min-h-[var(--tap-min)] cursor-pointer list-none items-center justify-between gap-4 py-4 text-h3 font-bold text-ink [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <Icon
              icon={ChevronDown}
              size="md"
              className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <div className="pb-5 text-body text-ink-secondary">{item.a}</div>
        </details>
      ))}
    </div>
  )
}
