import { CountryFlag } from '@/components/atoms/CountryFlag'
import { formatScore } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

/** ブラケット1試合の表示用ビュー型（シリアライズ可能な値のみ） */
export interface BracketMatch {
  id: string
  /** ホーム（確定済みのみ。未確定は null） */
  home: { flagEmoji: string; nameJa: string } | null
  /** アウェイ（確定済みのみ。未確定は null） */
  away: { flagEmoji: string; nameJa: string } | null
  /** 未確定枠の日本語ラベル（例: "A組1位"） */
  homePlaceholder?: string
  awayPlaceholder?: string
  /** 確定スコア（未実施は null） */
  score: { home: number; away: number } | null
  /** PK戦結果（任意） */
  penalties?: { home: number; away: number }
}

/** ブラケットの1ラウンド（列） */
export interface BracketRound {
  /** ステージキー（"round32" 等） */
  stage: string
  /** 列見出し（例: "ラウンド32"） */
  label: string
  matches: BracketMatch[]
}

export interface BracketViewProps {
  /** メインのトーナメント列（round32 → ... → final の順） */
  rounds: ReadonlyArray<BracketRound>
  /** 3位決定戦（任意。本線とは別枠で表示） */
  thirdPlace?: BracketRound | null
  className?: string
}

/** 1チームの行（確定: 旗+国名 / 未確定: プレースホルダ） */
function TeamRow({
  team,
  placeholder,
  goals,
  isWinner,
}: {
  team: { flagEmoji: string; nameJa: string } | null
  placeholder?: string
  goals?: number
  isWinner: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5',
        isWinner ? 'font-bold text-text' : 'text-text-muted',
      )}
    >
      {team ? (
        <>
          <CountryFlag flagEmoji={team.flagEmoji} nameJa={team.nameJa} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm">{team.nameJa}</span>
        </>
      ) : (
        <>
          <span className="text-base leading-none text-text-muted" aria-hidden>
            ？
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {placeholder ?? '未定'}
          </span>
        </>
      )}
      {typeof goals === 'number' ? (
        <span className="shrink-0 text-sm font-bold tabular-nums text-text">
          {goals}
        </span>
      ) : null}
    </div>
  )
}

/** 試合ノード（両チームを縦に並べた1カード） */
function BracketNode({ match }: { match: BracketMatch }) {
  const { score } = match
  const hasScore = score !== null
  const homeWin = score !== null && score.home > score.away
  const awayWin = score !== null && score.away > score.home

  const homeLabel = match.home?.nameJa ?? match.homePlaceholder ?? '未定'
  const awayLabel = match.away?.nameJa ?? match.awayPlaceholder ?? '未定'

  return (
    <div className="relative w-44 shrink-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <TeamRow
        team={match.home}
        placeholder={match.homePlaceholder}
        goals={score?.home}
        isWinner={homeWin}
      />
      <div className="h-px bg-border" aria-hidden />
      <TeamRow
        team={match.away}
        placeholder={match.awayPlaceholder}
        goals={score?.away}
        isWinner={awayWin}
      />
      {match.penalties ? (
        <p className="border-t border-border px-2.5 py-1 text-center text-[11px] font-medium text-text-muted">
          {`PK ${match.penalties.home} - ${match.penalties.away}`}
        </p>
      ) : null}
      <span className="sr-only">
        {`${homeLabel} 対 ${awayLabel}${
          hasScore ? `（${formatScore(score)}）` : ''
        }`}
      </span>
    </div>
  )
}

/** 1ラウンド列（見出し + ノード群を縦に均等配置） */
function RoundColumn({ round }: { round: BracketRound }) {
  return (
    <div className="flex flex-col gap-3" role="group" aria-label={round.label}>
      <h3 className="text-center text-xs font-bold text-text-muted">
        {round.label}
      </h3>
      <ul className="flex flex-1 flex-col justify-around gap-3">
        {round.matches.map((match) => (
          <li key={match.id}>
            <BracketNode match={match} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * 決勝トーナメント表（ブラケット）。
 * CSS Flex で列=ラウンドを横並びにし、モバイルは overflow-x-auto で横スクロール。
 * 専用ライブラリ不使用。データ表示のみのため Server Component。
 */
export function BracketView({
  rounds,
  thirdPlace,
  className,
}: BracketViewProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      {/*
        スクロールラッパは親幅（w-full）に拘束し、横方向のあふれを内側で完結させる。
        内側 flex に min-w-max を持たせることで全ラウンドぶんの最小幅を確保しつつ、
        はみ出しは overflow-x-auto の内部スクロールに閉じ込める（ページ全体は
        横スクロールしない）。
      */}
      <div
        className="w-full min-w-0 max-w-full overflow-x-auto pb-2"
        tabIndex={0}
        role="region"
        aria-label="決勝トーナメント表（横スクロールできます）"
      >
        <div className="flex min-w-max items-stretch gap-4">
          {rounds.map((round) => (
            <RoundColumn key={round.stage} round={round} />
          ))}
        </div>
      </div>

      {thirdPlace && thirdPlace.matches.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-text">
            {thirdPlace.label}
          </h3>
          <ul className="flex flex-col gap-3">
            {thirdPlace.matches.map((match) => (
              <li key={match.id} className="flex">
                <BracketNode match={match} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
