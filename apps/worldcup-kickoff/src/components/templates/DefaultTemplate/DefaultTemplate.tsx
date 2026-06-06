import { cn } from '@/lib/utils/cn'

export interface DefaultTemplateProps {
  /** ページ本文 */
  children: React.ReactNode
  /** ページ見出し（任意。指定すると <h1> を描画） */
  title?: string
  /** 見出し下の補足説明（任意） */
  description?: string
  /**
   * ヘッダースロット。
   * 後続担当が SiteHeader（organisms）を差し込む。RootLayout 側の固定枠と併用する場合は不要。
   */
  header?: React.ReactNode
  /**
   * 下部ナビスロット。
   * 後続担当が BottomNav（organisms）を差し込む。RootLayout 側の固定枠と併用する場合は不要。
   */
  bottomNav?: React.ReactNode
  className?: string
}

/**
 * 全画面共通のレイアウト骨格（header スロット + 本文 + bottomNav スロット）。
 * データは持たず children/slot のみ受け取る純レイアウト。
 *
 * ── 後続担当への注意 ──
 * SiteHeader / BottomNav は RootLayout の固定枠に差し込む方式と、この template の
 * `header` / `bottomNav` スロットに渡す方式の両方に対応する。ページごとに選択する。
 */
export function DefaultTemplate({
  children,
  title,
  description,
  header,
  bottomNav,
  className,
}: DefaultTemplateProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {header}
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
      <div className="flex flex-col gap-4">{children}</div>
      {bottomNav}
    </div>
  )
}
