import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDateHeadingJST } from '@/lib/utils/date'

export interface DateGroupHeaderProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  /** その日のいずれかの試合の UTC ISO（JST 日付見出しに変換） */
  isoDate: string
  /** 任意: その日の試合数（バッジ表示） */
  matchCount?: number
}

/**
 * 日付グルーピングの見出し（例: "6月12日(金)"）。
 * 日程リストの sticky なセクションヘッダとして使う想定。Server Component。
 */
export function DateGroupHeader({
  isoDate,
  matchCount,
  className,
  ...props
}: DateGroupHeaderProps) {
  return (
    <h2
      className={cn(
        'flex items-center gap-2 py-2 text-sm font-bold text-text',
        className,
      )}
      {...props}
    >
      <Calendar className="h-4 w-4 shrink-0 text-pitch-600" aria-hidden />
      <span>{formatDateHeadingJST(isoDate)}</span>
      {typeof matchCount === 'number' ? (
        <span className="text-xs font-medium text-text-muted">
          {matchCount}試合
        </span>
      ) : null}
    </h2>
  )
}
