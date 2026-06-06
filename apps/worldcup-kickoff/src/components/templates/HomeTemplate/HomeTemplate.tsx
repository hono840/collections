import { cn } from '@/lib/utils/cn'

export interface HomeTemplateProps {
  /** ヒーロー領域（HomeHero organism を差し込む想定） */
  hero?: React.ReactNode
  /** ヒーロー下のセクション群（直近試合・用語ピックアップ等） */
  children: React.ReactNode
  className?: string
}

/**
 * ホーム専用レイアウト。ヒーロー（カウントダウン等）を大きく見せ、
 * その下にセクションを縦積みする。データは持たず slot のみ受け取る純レイアウト。
 *
 * ── 後続担当への注意 ──
 * `hero` には HomeHero organism、`children` には MatchSchedule（直近）等を渡す。
 */
export function HomeTemplate({ hero, children, className }: HomeTemplateProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {hero != null && <section>{hero}</section>}
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}
