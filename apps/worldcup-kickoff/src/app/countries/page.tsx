import type { Metadata } from 'next'
import { Info } from 'lucide-react'
import { ListDetailTemplate } from '@/components/templates/ListDetailTemplate'
import { CountryListItem } from '@/components/molecules/CountryListItem'
import { FavoriteToggle } from '@/components/molecules/FavoriteToggle'
import { TierLegendDialog } from '@/components/molecules/TierLegendDialog'
import {
  GroupStandings,
  type GroupStandingsEntry,
} from '@/components/organisms/GroupStandings'
import type { GroupTableTeamMeta } from '@/components/organisms/GroupTable'
import { getRepository } from '@/lib/data'
import type { Team } from '@/lib/domain'
import { CountriesView } from './CountriesView'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: '国図鑑',
  description:
    '2026 ワールドカップ出場48ヶ国をグループ別に紹介。国旗・愛称・強さの目安・見どころから、あなたの推し国を見つけよう。各グループの順位表も。',
}

/** 1グループ分の表示データ（国一覧と順位表で共用） */
interface GroupView {
  id: string
  label: string
  teams: Team[]
  standings: GroupStandingsEntry['standings']
}

/**
 * 国図鑑一覧（Server Component）。
 * teams / groups / 各グループの順位表を getRepository() から取得し、
 * グループA〜L別に国を並べる。表示の出し分け（一覧 / 順位表）だけ Client に委譲。
 */
export default async function CountriesPage() {
  const repo = getRepository()
  const [teams, groups] = await Promise.all([repo.getTeams(), repo.getGroups()])

  const teamByCode = new Map(teams.map((t) => [t.code, t]))

  // 各グループの順位表を並列取得
  const standingsByGroup = await Promise.all(
    groups.map((g) => repo.getGroupStandings(g.id)),
  )

  const groupViews: GroupView[] = groups.map((group, i) => ({
    id: group.id,
    label: group.label,
    teams: group.teamCodes
      .map((code) => teamByCode.get(code))
      .filter((t): t is Team => t != null),
    standings: standingsByGroup[i],
  }))

  // 順位表（GroupStandings）用の teamCode → 表示メタ辞書
  const teamMeta: Record<string, GroupTableTeamMeta> = {}
  for (const team of teams) {
    teamMeta[team.code] = {
      code: team.code,
      nameJa: team.nameJa,
      flagEmoji: team.flagEmoji,
    }
  }

  const standingsEntries: GroupStandingsEntry[] = groupViews.map((g) => ({
    id: g.id,
    label: g.label,
    standings: g.standings,
  }))

  // ── グループ別の国一覧（Server 描画ノード）──
  const listNode = (
    <div className="flex flex-col gap-5">
      {groupViews.map((group) => (
        <section key={group.id} className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-text">{group.label}</h2>
          <ul className="flex flex-col gap-2">
            {group.teams.map((team) => (
              <li key={team.code}>
                <CountryListItem
                  flagEmoji={team.flagEmoji}
                  nameJa={team.nameJa}
                  groupLabel={group.label}
                  tier={team.tier}
                  href={`/countries/${team.code}`}
                  trailing={
                    <FavoriteToggle teamCode={team.code} nameJa={team.nameJa} />
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )

  // ── 全グループ順位表（Server 描画ノード）──
  const standingsNode = (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-muted">
        各グループ上位2ヶ国＋3位の成績上位がラウンド32へ進出します。試合が始まる前は全て0からのスタートです。
      </p>
      <GroupStandings groups={standingsEntries} teamMeta={teamMeta} />
    </div>
  )

  return (
    <ListDetailTemplate
      title="国図鑑"
      description="出場48ヶ国をグループ別に。気になる国をタップして、推し国を見つけよう。"
    >
      {/* バッジ（優勝候補・ダークホース等）の意味＝凡例への導線 */}
      <div>
        <TierLegendDialog
          triggerClassName="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text-muted transition-colors hover:bg-pitch-50 hover:text-text"
          triggerAriaLabel="ランクの見方を開く"
        >
          <Info className="h-4 w-4" aria-hidden />
          ランク（優勝候補・ダークホースなど）の見方
        </TierLegendDialog>
      </div>
      <CountriesView list={listNode} standings={standingsNode} />
    </ListDetailTemplate>
  )
}
