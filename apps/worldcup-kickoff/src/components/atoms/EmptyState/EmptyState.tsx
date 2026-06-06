import { cn } from '@/lib/utils/cn'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 上部に表示するアイコン（lucide 等。装飾扱い） */
  icon?: React.ReactNode
  /** 見出し */
  title: string
  /** 補足説明 */
  description?: string
  /** 下部のアクション（ボタン等） */
  action?: React.ReactNode
}

/**
 * 空状態の表示（検索結果なし・予想未入力など）。
 * 初心者にやさしく、何をすればよいか伝える。Server Component。
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon != null && (
        <div className="text-text-muted" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-base font-bold text-text">{title}</p>
      {description != null && (
        <p className="max-w-xs text-sm text-text-muted">{description}</p>
      )}
      {action != null && <div className="mt-2">{action}</div>}
    </div>
  )
}
