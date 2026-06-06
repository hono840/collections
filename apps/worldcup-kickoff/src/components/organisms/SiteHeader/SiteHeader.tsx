import Link from 'next/link'
import { CountdownTimer } from '@/components/molecules/CountdownTimer'
import { cn } from '@/lib/utils/cn'

export interface SiteHeaderProps {
  className?: string
}

/**
 * サイト共通ヘッダ。`fixed top-0`・高さ 56px(h-14)・中央 max-w-[480px]。
 * 左にワードマーク（ホームへのリンク）、右に開幕までのコンパクトなカウントダウン。
 * layout の `pt-14` と対応し本文と重ならない。
 *
 * Server Component（内包する CountdownTimer のみ Client）。
 */
export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-30 h-14 border-b border-border bg-surface/95 backdrop-blur-sm',
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[480px] items-center justify-between gap-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg text-base font-extrabold text-pitch-700"
          aria-label="キックオフ ホームへ"
        >
          <span aria-hidden className="text-lg">
            ⚽
          </span>
          <span className="tracking-tight">キックオフ</span>
        </Link>

        <div className="flex flex-col items-end leading-none">
          <span className="text-[9px] font-medium text-text-muted">
            開幕まで
          </span>
          <CountdownTimer compact size="sm" />
        </div>
      </div>
    </header>
  )
}
