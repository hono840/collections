import { CountryFlag } from '@/components/atoms/CountryFlag'
import { cn } from '@/lib/utils/cn'
import { formatGoalDifference } from '@/lib/utils/format'
import type { GroupStanding } from '@/lib/domain'

export interface GroupTableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  /** 順位表1行のデータ（matches から計算済み） */
  standing: GroupStanding
  /** 国旗絵文字 */
  flagEmoji: string
  /** 日本語国名 */
  nameJa: string
  /** 上位（突破圏）としてハイライトするか（通常は rank<=2） */
  qualified?: boolean
}

const cell = 'px-1.5 py-2 text-center text-sm tabular-nums text-text-muted'

/**
 * 順位表の1行（`<tr>`）。順位・国旗・国名・試合数・勝分敗・得失点差・勝点を表示。
 * `<table>`（GroupTable organism）の `<tbody>` 内で使用する想定。Server Component。
 */
export function GroupTableRow({
  standing,
  flagEmoji,
  nameJa,
  qualified = false,
  className,
  ...props
}: GroupTableRowProps) {
  const { rank, played, won, drawn, lost, goalDifference, points } = standing

  return (
    <tr
      className={cn(
        'border-t border-border',
        qualified && 'bg-pitch-50',
        className,
      )}
      {...props}
    >
      {/* 順位 */}
      <td className="px-1.5 py-2 text-center text-sm font-bold tabular-nums text-text">
        {rank}
      </td>
      {/* 国（旗 + 名前） */}
      <th
        scope="row"
        className="px-1.5 py-2 text-left font-medium text-text"
      >
        <span className="flex items-center gap-2">
          <CountryFlag flagEmoji={flagEmoji} nameJa={nameJa} size="sm" />
          <span className="truncate text-sm">{nameJa}</span>
        </span>
      </th>
      {/* 試合数 */}
      <td className={cell}>{played}</td>
      {/* 勝 */}
      <td className={cell}>{won}</td>
      {/* 分 */}
      <td className={cell}>{drawn}</td>
      {/* 敗 */}
      <td className={cell}>{lost}</td>
      {/* 得失点差 */}
      <td className={cell}>{formatGoalDifference(goalDifference)}</td>
      {/* 勝点 */}
      <td className="px-1.5 py-2 text-center text-sm font-bold tabular-nums text-text">
        {points}
      </td>
    </tr>
  )
}
