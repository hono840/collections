import { SectionHeading } from '@/components/atoms/SectionHeading'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import type { Source } from '@/types/car'

export interface SourceListProps {
  sources: Source[]
}

/**
 * 出典一覧（organism）。ページが参照した全出典を集約表示する（AC-SRC-04）。
 * 図鑑としての信頼性＝差別化の中核を可視化する。
 */
export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) return null

  return (
    <section>
      <SectionHeading label="Sources">出典一覧</SectionHeading>
      <ul className="space-y-2">
        {sources.map((s, i) => (
          <li
            key={`${s.type}-${s.label}-${i}`}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ck-border py-2 last:border-b-0"
          >
            <SourceBadge source={s} />
            <span className="text-sm text-ck-text">{s.label}</span>
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="ck-num text-xs text-ck-accent hover:underline"
              >
                {s.url}
              </a>
            )}
            <span className="ck-num ml-auto text-xs text-ck-text-muted">
              取得 {s.retrievedAt}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
