import { cn } from '@/lib/utils/cn'

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** 先頭に表示する小アイコン（lucide 等。装飾扱い） */
  icon?: React.ReactNode
}

/**
 * 雰囲気タグ・カテゴリなどの軽量ラベル。Badge より控えめな枠線スタイル。
 * Server Component（表示のみ）。
 */
export function Tag({ icon, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-bg px-2 py-0.5 text-xs font-medium text-text-muted',
        className,
      )}
      {...props}
    >
      {icon != null && (
        <span className="inline-flex shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}
