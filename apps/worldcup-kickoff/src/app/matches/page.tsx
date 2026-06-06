import type { Metadata } from 'next'
import { getRepository } from '@/lib/data'
import { GROUP_IDS } from '@/lib/constants/tournament'
import {
  MatchSchedule,
  type MatchScheduleFilter,
  type MatchScheduleItem,
} from '@/components/organisms/MatchSchedule'
import type { CountryCode, Team } from '@/lib/domain'

export const metadata: Metadata = {
  title: '試合日程',
  description:
    '2026 FIFA ワールドカップ全104試合の日程。グループステージから決勝まで、日本時間（JST）で日付ごとに見やすく整理。グループ別・決勝トーナメントで絞り込めます。',
}

/** チーム表示情報（国旗 + 日本語名）をビュー型に変換 */
function toTeamView(
  team: Team | undefined,
): { flagEmoji: string; nameJa: string } | null {
  if (!team) return null
  return { flagEmoji: team.flagEmoji, nameJa: team.nameJa }
}

/**
 * 試合日程ページ（Server Component）。
 * 全104試合・teams・stadiums を取得し、シリアライズ可能なビュー型に正規化して
 * Client organism（MatchSchedule）へ渡す。Date は渡さず ISO 文字列のまま。
 */
export default async function MatchesPage() {
  const repo = getRepository()
  const [matches, teams, stadiums] = await Promise.all([
    repo.getMatches(),
    repo.getTeams(),
    repo.getStadiums(),
  ])

  const teamByCode = new Map<CountryCode, Team>(teams.map((t) => [t.code, t]))
  const stadiumNameById = new Map(stadiums.map((s) => [s.id, s.name]))

  const items: MatchScheduleItem[] = matches.map((m) => ({
    id: m.id,
    stage: m.stage,
    groupId: m.groupId,
    kickoffUtc: m.kickoffUtc,
    home: toTeamView(m.homeTeamCode ? teamByCode.get(m.homeTeamCode) : undefined),
    away: toTeamView(m.awayTeamCode ? teamByCode.get(m.awayTeamCode) : undefined),
    homePlaceholder: m.homePlaceholderJa,
    awayPlaceholder: m.awayPlaceholderJa,
    stadiumName: m.stadiumId ? (stadiumNameById.get(m.stadiumId) ?? null) : null,
    roundLabelJa: m.roundLabelJa,
    score: m.score,
  }))

  const filters: MatchScheduleFilter[] = [
    { value: 'all', label: 'すべて' },
    ...GROUP_IDS.map((id) => ({ value: id, label: `${id}組` })),
    { value: 'knockout', label: '決勝T' },
  ]

  return (
    <div className="flex flex-col gap-4 py-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-text">試合日程</h1>
        <p className="text-sm text-text-muted">
          全104試合を日本時間でチェック。グループや決勝トーナメントで絞り込めます。
        </p>
      </header>
      <MatchSchedule matches={items} filters={filters} />
    </div>
  )
}
