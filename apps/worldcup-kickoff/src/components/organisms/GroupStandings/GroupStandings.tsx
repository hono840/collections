import { GroupTable, type GroupTableTeamMeta } from '@/components/organisms/GroupTable'
import { cn } from '@/lib/utils/cn'
import type { GroupStanding } from '@/lib/domain'

/** 1グループ分の順位表データ（page で getGroupStandings を呼んで構築） */
export interface GroupStandingsEntry {
  /** グループID（"A"〜"L"） */
  id: string
  /** 表示ラベル（例: "グループA"） */
  label: string
  /** 計算済み順位表（rank 昇順） */
  standings: GroupStanding[]
}

export interface GroupStandingsProps {
  /** 全グループ分の順位表（通常 A〜L の12件） */
  groups: GroupStandingsEntry[]
  /** teamCode → 表示メタ（旗・国名）。全グループ共通の辞書 */
  teamMeta: Record<string, GroupTableTeamMeta>
  className?: string
}

/**
 * 全12グループの順位表一覧。GroupTable をグリッドで並べる。
 *
 * 結果未定でも各 GroupTable が全0の表として成立する。計算は Server（page）で
 * 済ませ、ここは並べるだけ。Server Component。
 */
export function GroupStandings({
  groups,
  teamMeta,
  className,
}: GroupStandingsProps) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}
    >
      {groups.map((group) => (
        <GroupTable
          key={group.id}
          label={group.label}
          standings={group.standings}
          teamMeta={teamMeta}
        />
      ))}
    </div>
  )
}
