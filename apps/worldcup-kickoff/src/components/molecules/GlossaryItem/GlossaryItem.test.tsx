import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlossaryItem } from './GlossaryItem'

/** dt/dd を有効な DOM に置くためのラッパ */
function renderItem(ui: React.ReactElement) {
  return render(<dl>{ui}</dl>)
}

describe('GlossaryItem', () => {
  it('用語と意味が表示される', () => {
    renderItem(
      <GlossaryItem
        termJa="オフサイド"
        definitionJa="攻撃側の選手が相手最終ラインより前でパスを受ける反則。"
        category="rule"
      />,
    )
    expect(screen.getByText('オフサイド')).toBeInTheDocument()
    expect(
      screen.getByText(/攻撃側の選手が相手最終ライン/),
    ).toBeInTheDocument()
  })

  it('読み仮名があれば表示される', () => {
    renderItem(
      <GlossaryItem
        termJa="オフサイド"
        reading="おふさいど"
        definitionJa="反則の一種。"
        category="rule"
      />,
    )
    expect(screen.getByText('おふさいど')).toBeInTheDocument()
  })

  it('カテゴリに応じたバッジが表示される', () => {
    renderItem(
      <GlossaryItem
        termJa="ストライカー"
        definitionJa="点を取る役割の選手。"
        category="position"
      />,
    )
    expect(screen.getByText('ポジション')).toBeInTheDocument()
  })

  it('anchorId が要素 id に設定される', () => {
    const { container } = renderItem(
      <GlossaryItem
        termJa="オフサイド"
        definitionJa="反則。"
        category="rule"
        anchorId="offside"
      />,
    )
    expect(container.querySelector('#offside')).not.toBeNull()
  })

  it('用語は dt、意味は dd で出力される', () => {
    renderItem(
      <GlossaryItem
        termJa="PK"
        definitionJa="ペナルティキック。"
        category="rule"
      />,
    )
    expect(screen.getByText('PK').closest('dt')).not.toBeNull()
    expect(
      screen.getByText('ペナルティキック。').closest('dd'),
    ).not.toBeNull()
  })
})
