import type { Metadata } from 'next'
import { DefaultTemplate } from '@/components/templates/DefaultTemplate'
import {
  PredictionBoard,
  type PredictionMatchView,
} from '@/components/organisms/PredictionBoard'
import { getRepository } from '@/lib/data'
import type { CountryCode, Match, Stadium, Team } from '@/lib/domain'

/** 決勝トーナメントのステージ集合（グループ以外＝knockout 判定に使う） */
const KNOCKOUT_STAGES = new Set<Match['stage']>([
  'round32',
  'round16',
  'quarter',
  'semi',
  'third',
  'final',
])

export const metadata: Metadata = {
  title: '勝敗予想',
  description:
    '全試合の勝敗をあなたの予想で。グループステージから決勝まで、勝ち・引き分け・負けを選んで予想を記録。ブラウザに自動保存されます。',
}

/** Match を PredictionBoard 用のシリアライズ可能ビューへ変換 */
function toMatchView(
  match: Match,
  teamMap: Map<CountryCode, Team>,
  stadiumMap: Map<string, Stadium>,
): PredictionMatchView {
  const home = match.homeTeamCode ? teamMap.get(match.homeTeamCode) : undefined
  const away = match.awayTeamCode ? teamMap.get(match.awayTeamCode) : undefined
  const stadium = match.stadiumId ? stadiumMap.get(match.stadiumId) : undefined
  const predictable = home != null && away != null

  return {
    matchId: match.id,
    phase: KNOCKOUT_STAGES.has(match.stage) ? 'knockout' : 'group',
    home: home ? { flagEmoji: home.flagEmoji, nameJa: home.nameJa } : null,
    away: away ? { flagEmoji: away.flagEmoji, nameJa: away.nameJa } : null,
    homePlaceholder: match.homePlaceholderJa,
    awayPlaceholder: match.awayPlaceholderJa,
    kickoffUtc: match.kickoffUtc,
    stadiumName: stadium?.name ?? null,
    roundLabelJa: match.roundLabelJa,
    predictable,
  }
}

/**
 * 勝敗予想ページ。全試合とチーム・会場を取得し、シリアライズ可能なビューへ整形して
 * PredictionBoard（Client）に渡す。予想の永続化は PredictionButton 内のフックが担う。
 * Server Component。
 */
export default async function PredictionsPage() {
  const repo = getRepository()
  const [matches, teams, stadiums] = await Promise.all([
    repo.getMatches(),
    repo.getTeams(),
    repo.getStadiums(),
  ])

  const teamMap = new Map(teams.map((t) => [t.code, t]))
  const stadiumMap = new Map(stadiums.map((s) => [s.id, s]))

  const views = matches.map((m) => toMatchView(m, teamMap, stadiumMap))

  return (
    <DefaultTemplate
      title="勝敗予想"
      description="勝ち・引き分け・負けを選ぶだけ。予想はこの端末に自動保存されます。"
    >
      <PredictionBoard matches={views} />
    </DefaultTemplate>
  )
}
