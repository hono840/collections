import { Eye, Lightbulb, Star, Users } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { CountryFlag } from '@/components/atoms/CountryFlag'
import { Badge } from '@/components/atoms/Badge'
import { Tag } from '@/components/atoms/Tag'
import { EmptyState } from '@/components/atoms/EmptyState'
import { FavoriteToggle } from '@/components/molecules/FavoriteToggle'
import { MatchCard, type MatchCardTeam } from '@/components/molecules/MatchCard'
import { cn } from '@/lib/utils/cn'
import type {
  Player,
  PlayerPosition,
  Team,
  TeamTier,
} from '@/lib/domain'

/** CountryDetailPanel が描画する1試合分の表示データ（page でシリアライズ可能に整形） */
export interface CountryMatchView {
  id: string
  home: MatchCardTeam | null
  away: MatchCardTeam | null
  homePlaceholder?: string
  awayPlaceholder?: string
  kickoffUtc: string
  stadiumName: string | null
  roundLabelJa: string
  score: { home: number; away: number } | null
}

export interface CountryDetailPanelProps {
  team: Team
  /** 所属グループの表示ラベル（例: "グループA"） */
  groupLabel: string
  /** 注目選手（getPlayersByTeam の結果） */
  players: Player[]
  /** その国の試合（page で整形済み・キックオフ昇順想定） */
  matches: CountryMatchView[]
  className?: string
}

const TIER_META: Record<
  TeamTier,
  { label: string; variant: 'gold' | 'pitch' | 'neutral' }
> = {
  favorite: { label: '優勝候補', variant: 'gold' },
  darkhorse: { label: 'ダークホース', variant: 'pitch' },
  underdog: { label: 'チャレンジャー', variant: 'neutral' },
}

const POSITION_ORDER: PlayerPosition[] = ['GK', 'DF', 'MF', 'FW']
const POSITION_LABEL: Record<PlayerPosition, string> = {
  GK: 'GK（ゴールキーパー）',
  DF: 'DF（ディフェンダー）',
  MF: 'MF（ミッドフィルダー）',
  FW: 'FW（フォワード）',
}

/** ポジション順 → 各ポジション内は入力順で選手をまとめる */
function groupPlayersByPosition(
  players: Player[],
): { position: PlayerPosition; players: Player[] }[] {
  return POSITION_ORDER.map((position) => ({
    position,
    players: players.filter((p) => p.position === position),
  })).filter((group) => group.players.length > 0)
}

/** セクション見出し（アイコン + ラベル） */
function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <h2 className="flex items-center gap-2 text-base font-bold text-text">
      <span className="text-pitch-600" aria-hidden>
        {icon}
      </span>
      {children}
    </h2>
  )
}

/**
 * 国詳細パネル。国旗（大）・国名・グループ・紹介・見どころ・豆知識・注目選手・試合を表示。
 * 推し国登録は Client の FavoriteToggle に閉じ込め、パネル全体は Server Component。
 */
export function CountryDetailPanel({
  team,
  groupLabel,
  players,
  matches,
  className,
}: CountryDetailPanelProps) {
  const tierMeta = TIER_META[team.tier]
  const playersByPosition = groupPlayersByPosition(players)

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* ── ヘッダー（旗 + 国名 + グループ + tier + 推しトグル）── */}
      <header className="flex flex-col items-center gap-3 text-center">
        <CountryFlag flagEmoji={team.flagEmoji} nameJa={team.nameJa} size="xl" />
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-extrabold text-text">{team.nameJa}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="neutral">{groupLabel}</Badge>
            <Badge variant={tierMeta.variant}>{tierMeta.label}</Badge>
          </div>
        </div>
        <FavoriteToggle teamCode={team.code} nameJa={team.nameJa} showLabel />
      </header>

      {/* ── 一言紹介 ── */}
      <Card padding="lg" className="flex flex-col gap-2">
        <p className="text-sm leading-relaxed text-text">{team.blurbJa}</p>
        {team.vibeJa.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {team.vibeJa.map((vibe) => (
              <Tag key={vibe}>{vibe}</Tag>
            ))}
          </div>
        ) : null}
      </Card>

      {/* ── 見どころ ── */}
      <section className="flex flex-col gap-2">
        <SectionHeading icon={<Eye className="h-5 w-5" />}>
          ここが見どころ
        </SectionHeading>
        <Card padding="md">
          <p className="text-sm leading-relaxed text-text">
            {team.watchPointJa}
          </p>
        </Card>
      </section>

      {/* ── 豆知識 ── */}
      {team.funFactsJa.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionHeading icon={<Lightbulb className="h-5 w-5" />}>
            会話で使える豆知識
          </SectionHeading>
          <ul className="flex flex-col gap-2">
            {team.funFactsJa.map((fact, i) => (
              <li key={i}>
                <Card padding="md" className="flex items-start gap-2">
                  <span
                    className="mt-0.5 shrink-0 text-gold-500"
                    aria-hidden
                  >
                    <Star className="h-4 w-4 fill-gold-400" />
                  </span>
                  <span className="text-sm leading-relaxed text-text">
                    {fact}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── 注目選手 ── */}
      <section className="flex flex-col gap-2">
        <SectionHeading icon={<Users className="h-5 w-5" />}>
          注目選手
        </SectionHeading>
        {playersByPosition.length > 0 ? (
          <div className="flex flex-col gap-3">
            {playersByPosition.map((group) => (
              <div key={group.position} className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-text-muted">
                  {POSITION_LABEL[group.position]}
                </h3>
                <ul className="flex flex-col gap-2">
                  {group.players.map((player) => (
                    <li key={player.id}>
                      <Card padding="md" className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-text">
                          {player.nameJa}
                        </span>
                        <span className="text-sm leading-relaxed text-text-muted">
                          {player.highlightJa}
                        </span>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <Card padding="md">
            <p className="text-sm text-text-muted">
              注目選手は準備中です。試合が始まったら要チェック。
            </p>
          </Card>
        )}
      </section>

      {/* ── その国の試合 ── */}
      <section className="flex flex-col gap-2">
        <SectionHeading icon={<Eye className="h-5 w-5" />}>
          {team.nameJa}の試合
        </SectionHeading>
        {matches.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {matches.map((match) => (
              <li key={match.id}>
                <MatchCard
                  home={match.home}
                  away={match.away}
                  homePlaceholder={match.homePlaceholder}
                  awayPlaceholder={match.awayPlaceholder}
                  kickoffUtc={match.kickoffUtc}
                  stadiumName={match.stadiumName}
                  roundLabelJa={match.roundLabelJa}
                  score={match.score}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="試合はまだありません"
            description="対戦カードが決まったらここに表示されます。"
          />
        )}
      </section>
    </div>
  )
}
