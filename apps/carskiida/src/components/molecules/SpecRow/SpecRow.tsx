import { cn } from '@/lib/utils/cn'
import { Spec } from '@/components/atoms/Spec'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import type { Source } from '@/types/car'

export interface SpecRowProps {
  label: string
  /** 値の表示文字列。null/undefined は欠損として「—」を表示する */
  value?: string | null
  source?: Source
  className?: string
}

/**
 * ラベル + 値 + 出典 の 1 行（molecule）。
 * 欠損（value が空）は空欄や 0 でごまかさず「— データなし」を明示する。
 */
export function SpecRow({ label, value, source, className }: SpecRowProps) {
  const isMissing = value === null || value === undefined || value === ''

  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 border-b border-ck-border py-2',
        className
      )}
    >
      <dt className="shrink-0 text-sm text-ck-text-muted">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        {isMissing ? (
          <span className="text-sm text-ck-text-muted" title="データなし">
            — データなし
          </span>
        ) : (
          <>
            <Spec value={value} />
            {source && <SourceBadge source={source} />}
          </>
        )}
      </dd>
    </div>
  )
}
