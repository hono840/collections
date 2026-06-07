import { cn } from '@/lib/utils/cn'
import type { Source, SourceType } from '@/types/car'

const TYPE_LABEL: Record<SourceType, string> = {
  vpic: 'vPIC',
  wikidata: 'Wikidata',
  wikipedia: 'Wikipedia',
  manufacturer: 'OEM',
  ugc: 'UGC',
  editor: '編集部',
}

export interface SourceBadgeProps {
  source: Source
  className?: string
}

/**
 * 出典バッジ（atom）— carskiida の信頼性の象徴。
 * 出典種別を記号化して表示し、URL があれば外部リンクにする。
 * UGC は破線枠で一次資料と視覚的に区別する。
 */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  const label = TYPE_LABEL[source.type]
  const title = [
    source.label,
    source.confidence === 'low' ? '（要確認）' : '',
    source.url ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const isLow = source.confidence === 'low'

  const base = cn(
    'ck-num inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-ck-source',
    source.type === 'ugc' ? 'border-dashed border-ck-source' : 'border-ck-source',
    className
  )

  const content = (
    <>
      <span aria-hidden>◆</span>
      <span>{label}</span>
      {isLow && (
        <span className="text-ck-warn" title="出典の信頼度が低い項目です">
          要確認
        </span>
      )}
    </>
  )

  const accessibleLabel = `出典: ${source.label}${source.confidence === 'low' ? '（要確認）' : ''}`

  if (source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        title={title}
        aria-label={accessibleLabel}
        className={cn(base, 'transition-colors hover:bg-ck-source/10')}
      >
        {content}
      </a>
    )
  }

  return (
    <span title={title} aria-label={accessibleLabel} className={base}>
      {content}
    </span>
  )
}
