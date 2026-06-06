import { Skeleton } from '@/components/atoms/Skeleton'

/**
 * 試合日程ページのローディング状態。
 * フィルタタブ + 日付見出し + 試合カードのスケルトンを表示する。Server Component。
 */
export default function MatchesLoading() {
  return (
    <div className="flex flex-col gap-4 py-2" aria-busy aria-live="polite">
      <span className="sr-only">試合日程を読み込んでいます</span>

      {/* 見出し */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* フィルタタブ */}
      <Skeleton shape="rect" className="h-12 w-full" />

      {/* 日付グループ × 2 */}
      {Array.from({ length: 2 }).map((_, group) => (
        <div key={group} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, card) => (
            <Skeleton key={card} shape="rect" className="h-28 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}
