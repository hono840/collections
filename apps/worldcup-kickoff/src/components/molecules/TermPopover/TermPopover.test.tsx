import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TermPopover } from './TermPopover'

const term = {
  termJa: 'オフサイド',
  definitionJa: '攻撃側の選手が相手最終ラインより前でパスを受ける反則。',
  reading: 'おふさいど',
}

describe('TermPopover', () => {
  it('ハイライト用語がトリガーとして表示される', () => {
    render(<TermPopover term={term}>オフサイド</TermPopover>)
    expect(
      screen.getByRole('button', { name: 'オフサイド' }),
    ).toBeInTheDocument()
  })

  it('初期状態では解説（tooltip）が閉じている', () => {
    render(<TermPopover term={term}>オフサイド</TermPopover>)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('クリックで解説が開く', async () => {
    const user = userEvent.setup()
    render(<TermPopover term={term}>オフサイド</TermPopover>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(
      screen.getByText(/攻撃側の選手が相手最終ライン/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('再クリックで解説が閉じる', async () => {
    const user = userEvent.setup()
    render(<TermPopover term={term}>オフサイド</TermPopover>)
    const trigger = screen.getByRole('button')
    await user.click(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.click(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('Escape で閉じてトリガーへフォーカスが戻る', async () => {
    const user = userEvent.setup()
    render(<TermPopover term={term}>オフサイド</TermPopover>)
    const trigger = screen.getByRole('button')
    await user.click(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('children を省略すると term.termJa がラベルになる', () => {
    render(<TermPopover term={term} />)
    expect(
      screen.getByRole('button', { name: 'オフサイド' }),
    ).toBeInTheDocument()
  })
})
