import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupTableRow } from './GroupTableRow'
import type { GroupStanding } from '@/lib/domain'

const standing: GroupStanding = {
  teamCode: 'JPN',
  played: 3,
  won: 2,
  drawn: 1,
  lost: 0,
  goalsFor: 5,
  goalsAgainst: 2,
  goalDifference: 3,
  points: 7,
  rank: 1,
}

/** `<tr>` を有効な DOM ツリーに置くためのラッパ */
function renderRow(ui: React.ReactElement) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  )
}

describe('GroupTableRow', () => {
  it('順位・国名・勝点が表示される', () => {
    renderRow(
      <GroupTableRow standing={standing} flagEmoji="🇯🇵" nameJa="日本" />,
    )
    expect(screen.getByText('日本')).toBeInTheDocument()
    // 数値はセルごとに検証（順位=1, 勝点=7）。「1」は順位・分の2箇所に出る
    expect(screen.getAllByText('1').length).toBe(2)
    expect(screen.getByText('7')).toBeInTheDocument() // 勝点
  })

  it('勝分敗・試合数が表示される', () => {
    renderRow(
      <GroupTableRow standing={standing} flagEmoji="🇯🇵" nameJa="日本" />,
    )
    // 試合数3・勝2・分1・敗0（分と順位で「1」が2つ）
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBe(2)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('得失点差が符号付きで表示される', () => {
    renderRow(
      <GroupTableRow standing={standing} flagEmoji="🇯🇵" nameJa="日本" />,
    )
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('行は tr 要素として描画される', () => {
    renderRow(
      <GroupTableRow standing={standing} flagEmoji="🇯🇵" nameJa="日本" />,
    )
    expect(screen.getByRole('row')).toBeInTheDocument()
  })

  it('国名セルは行ヘッダ（th scope=row）になる', () => {
    renderRow(
      <GroupTableRow standing={standing} flagEmoji="🇯🇵" nameJa="日本" />,
    )
    const rowHeader = screen.getByRole('rowheader', { name: /日本/ })
    expect(rowHeader).toBeInTheDocument()
  })

  it('qualified の場合は突破圏ハイライトが適用される', () => {
    renderRow(
      <GroupTableRow
        standing={standing}
        flagEmoji="🇯🇵"
        nameJa="日本"
        qualified
      />,
    )
    expect(screen.getByRole('row').className).toContain('bg-pitch-50')
  })
})
