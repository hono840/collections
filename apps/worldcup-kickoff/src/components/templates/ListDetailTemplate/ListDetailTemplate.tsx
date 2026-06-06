import { cn } from '@/lib/utils/cn'

export interface ListDetailTemplateProps {
  /** ページ見出し（任意） */
  title?: string
  /** 見出し下の補足説明（任意） */
  description?: string
  /** タイトル直下のフィルタ・検索バー等のスロット */
  toolbar?: React.ReactNode
  /** 一覧・詳細の本文 */
  children: React.ReactNode
  className?: string
}

/**
 * 一覧＋詳細系（国図鑑・ルール図鑑）のレイアウト骨格。
 * 見出し → ツールバー（フィルタ/検索） → 本文 の縦積み。
 * データは持たず slot のみ受け取る純レイアウト。
 *
 * ── 後続担当への注意 ──
 * `toolbar` に FilterTabs / 検索（molecules）、`children` に一覧 or 詳細パネルを渡す。
 */
export function ListDetailTemplate({
  title,
  description,
  toolbar,
  children,
  className,
}: ListDetailTemplateProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {(title != null || description != null) && (
        <header className="flex flex-col gap-1">
          {title != null && (
            <h1 className="text-2xl font-extrabold text-text">{title}</h1>
          )}
          {description != null && (
            <p className="text-sm text-text-muted">{description}</p>
          )}
        </header>
      )}
      {toolbar != null && <div className="sticky top-14 z-10">{toolbar}</div>}
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}
