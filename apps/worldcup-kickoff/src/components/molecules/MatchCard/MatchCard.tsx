import { MapPin } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { CountryFlag } from '@/components/atoms/CountryFlag'
import { Score } from '@/components/atoms/Score'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils/cn'
import { formatTimeJST } from '@/lib/utils/date'

/** 確定済みチーム or 未確定枠（プレースホルダ文字列）を表す表示用の型 */
export interface MatchCardTeam {
  /** 国旗絵文字（例: "🇯🇵"） */
  flagEmoji: string
  /** 日本語国名（例: "日本"） */
  nameJa: string
}

export interface MatchCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** ホーム。確定済みなら国情報、未確定なら省略しプレースホルダ文字列で表示 */
  home?: MatchCardTeam | null
  away?: MatchCardTeam | null
  /** 未確定枠の表示ラベル（例: "A組1位"）。home/away が無いとき使用 */
  homePlaceholder?: string
  awayPlaceholder?: string
  /** キックオフ日時（UTC ISO 8601）。JST 時刻に変換して表示 */
  kickoffUtc: string
  /** 会場名（任意） */
  stadiumName?: string | null
  /** ステージ/節の表示ラベル（例: "グループステージ", "準々決勝"） */
  roundLabelJa: string
  /** 確定スコア（未実施は null/undefined） */
  score?: { home: number; away: number } | null
  /** 任意のアクションスロット（予想ボタン等）。カード下部に配置 */
  children?: React.ReactNode
}

/** チーム1サイド（旗 + 国名 or プレースホルダ）の表示 */
function TeamSide({
  team,
  placeholder,
}: {
  team?: MatchCardTeam | null
  placeholder?: string
}) {
  if (team) {
    return (
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <CountryFlag flagEmoji={team.flagEmoji} nameJa={team.nameJa} size="md" />
        <span className="line-clamp-2 text-sm font-bold text-text">
          {team.nameJa}
        </span>
      </div>
    )
  }
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <span className="text-3xl leading-none text-text-muted" aria-hidden>
        ？
      </span>
      <span className="line-clamp-2 text-sm font-medium text-text-muted">
        {placeholder ?? '未定'}
      </span>
    </div>
  )
}

/**
 * 1試合カード。両チーム（確定 or プレースホルダ）・JST時刻・会場・ステージ・スコアを表示。
 * 任意で children（予想ボタン等）を下部スロットに差せる。Server Component（表示のみ）。
 */
export function MatchCard({
  home,
  away,
  homePlaceholder,
  awayPlaceholder,
  kickoffUtc,
  stadiumName,
  roundLabelJa,
  score,
  children,
  className,
  ...props
}: MatchCardProps) {
  const homeLabel = home?.nameJa ?? homePlaceholder ?? '未定'
  const awayLabel = away?.nameJa ?? awayPlaceholder ?? '未定'

  return (
    <Card className={cn('flex flex-col gap-3', className)} {...props}>
      {/* ヘッダ: ステージラベル + キックオフ時刻 */}
      <div className="flex items-center justify-between gap-2">
        <Badge variant="pitch">{roundLabelJa}</Badge>
        <time className="text-xs font-bold tabular-nums text-text-muted">
          {formatTimeJST(kickoffUtc)}
        </time>
      </div>

      {/* 対戦カード: home - score - away */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide team={home} placeholder={homePlaceholder} />
        <div className="flex flex-col items-center px-1">
          <Score home={score?.home} away={score?.away} size="md" />
        </div>
        <TeamSide team={away} placeholder={awayPlaceholder} />
      </div>

      {/* 会場 */}
      {stadiumName ? (
        <div className="flex items-center justify-center gap-1 text-xs text-text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{stadiumName}</span>
        </div>
      ) : null}

      {/* スクリーンリーダー向けの対戦概要 */}
      <span className="sr-only">
        {`${homeLabel} 対 ${awayLabel}`}
      </span>

      {/* アクションスロット（予想ボタン等） */}
      {children ? <div className="mt-1">{children}</div> : null}
    </Card>
  )
}
