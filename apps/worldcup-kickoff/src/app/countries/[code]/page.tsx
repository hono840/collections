import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ListDetailTemplate } from '@/components/templates/ListDetailTemplate'
import {
  CountryDetailPanel,
  type CountryMatchView,
} from '@/components/organisms/CountryDetailPanel'
import { getRepository } from '@/lib/data'
import { groupLabel } from '@/lib/constants/tournament'
import type { Match, Stadium, Team } from '@/lib/domain'

export const dynamicParams = false

/** 全48ヶ国を静的生成する */
export async function generateStaticParams(): Promise<{ code: string }[]> {
  const teams = await getRepository().getTeams()
  return teams.map((team) => ({ code: team.code }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const team = await getRepository().getTeamByCode(code)
  if (!team) {
    return { title: '国が見つかりません' }
  }
  const title = `${team.nameJa} | ${groupLabel(team.groupId)}`
  const description = `${team.nameJa}の基本情報・見どころ・豆知識・注目選手・試合日程。${team.blurbJa}`
  return {
    title,
    description,
    openGraph: {
      title: `${team.nameJa}（${groupLabel(team.groupId)}）`,
      description,
    },
  }
}

/** Match → CountryDetailPanel が受け取るシリアライズ可能な表示データに整形 */
function toMatchView(
  match: Match,
  teamByCode: Map<string, Team>,
  stadiumById: Map<string, Stadium>,
): CountryMatchView {
  const home = match.homeTeamCode
    ? teamByCode.get(match.homeTeamCode)
    : undefined
  const away = match.awayTeamCode
    ? teamByCode.get(match.awayTeamCode)
    : undefined
  const stadium = match.stadiumId
    ? stadiumById.get(match.stadiumId)
    : undefined

  return {
    id: match.id,
    home: home ? { flagEmoji: home.flagEmoji, nameJa: home.nameJa } : null,
    away: away ? { flagEmoji: away.flagEmoji, nameJa: away.nameJa } : null,
    homePlaceholder: match.homePlaceholderJa,
    awayPlaceholder: match.awayPlaceholderJa,
    kickoffUtc: match.kickoffUtc,
    stadiumName: stadium ? `${stadium.name}（${stadium.city}）` : null,
    roundLabelJa: match.roundLabelJa,
    score: match.score,
  }
}

/**
 * 国詳細ページ（Server Component）。
 * generateStaticParams で48ヶ国を静的生成し、dynamicParams=false で未定義コードは404。
 * params は Promise（Next.js 16）なので await して受ける。
 */
export default async function CountryDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const repo = getRepository()

  const team = await repo.getTeamByCode(code)
  if (!team) notFound()

  const [teams, stadiums, players, matches] = await Promise.all([
    repo.getTeams(),
    repo.getStadiums(),
    repo.getPlayersByTeam(team.code),
    repo.getMatchesByTeam(team.code),
  ])

  const teamByCode = new Map(teams.map((t) => [t.code, t]))
  const stadiumById = new Map(stadiums.map((s) => [s.id, s]))

  const matchViews = [...matches]
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))
    .map((m) => toMatchView(m, teamByCode, stadiumById))

  return (
    <ListDetailTemplate>
      <CountryDetailPanel
        team={team}
        groupLabel={groupLabel(team.groupId)}
        players={players}
        matches={matchViews}
      />
    </ListDetailTemplate>
  )
}
