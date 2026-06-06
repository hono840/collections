import { GroupTableRow } from '@/components/molecules/GroupTableRow'
import { cn } from '@/lib/utils/cn'
import type { GroupStanding } from '@/lib/domain'

/** 順位表の各国の表示メタ（旗・国名）を引くための最小情報 */
export interface GroupTableTeamMeta {
  code: string
  nameJa: string
  flagEmoji: string
}

export interface GroupTableProps {
  /** グループ表示ラベル（例: "グループA"） */
  label: string
  /** 順位計算済みの行（rank 昇順想定。computeStandings の出力） */
  standings: GroupStanding[]
  /** teamCode → 表示メタ。standings の各 teamCode を解決する */
  teamMeta: Record<string, GroupTableTeamMeta>
  /** 上位何位までを突破圏ハイライトするか（既定 2） */
  qualifiedRank?: number
  className?: string
}

const headCell =
  'px-1.5 py-2 text-center text-xs font-bold text-text-muted'

/**
 * 1グループの順位表（`<table>`）。GroupTableRow を `<tbody>` 内に並べる。
 *
 * 結果未定（全試合 score=null）でも computeStandings が全0行を返すため、
 * 表として成立する（開幕前の「これから始まる」状態を素直に表現）。
 * 計算は Server 側（page）で済ませ、ここは表示のみ。Server Component。
 */
export function GroupTable({
  label,
  standings,
  teamMeta,
  qualifiedRank = 2,
  className,
}: GroupTableProps) {
  return (
    <section
      aria-label={`${label}の順位表`}
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-surface',
        className,
      )}
    >
      <h3 className="border-b border-border px-3 py-2 text-sm font-bold text-text">
        {label}
      </h3>
      <table className="w-full border-collapse">
        <caption className="sr-only">
          {label}の順位表。順位・国名・試合数・勝・分・敗・得失点差・勝点。
        </caption>
        <thead>
          <tr>
            <th scope="col" className={headCell}>
              順
            </th>
            <th scope="col" className={cn(headCell, 'text-left')}>
              国
            </th>
            <th scope="col" className={headCell} title="試合数">
              試
            </th>
            <th scope="col" className={headCell} title="勝">
              勝
            </th>
            <th scope="col" className={headCell} title="分">
              分
            </th>
            <th scope="col" className={headCell} title="敗">
              敗
            </th>
            <th scope="col" className={headCell} title="得失点差">
              差
            </th>
            <th scope="col" className={headCell} title="勝点">
              点
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => {
            const meta = teamMeta[standing.teamCode]
            return (
              <GroupTableRow
                key={standing.teamCode}
                standing={standing}
                flagEmoji={meta?.flagEmoji ?? '🏳️'}
                nameJa={meta?.nameJa ?? standing.teamCode}
                qualified={standing.rank <= qualifiedRank}
              />
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
