import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TierLegendDialog } from './TierLegendDialog'
import { TIER_META } from '@/lib/constants/tiers'

const TRIGGER_LABEL = 'ランクの見方を開く'

function renderDialog(title?: string) {
  return render(
    <TierLegendDialog triggerAriaLabel={TRIGGER_LABEL} title={title}>
      <span>ダークホース</span>
    </TierLegendDialog>,
  )
}

describe('TierLegendDialog', () => {
  it('トリガーボタンが表示される', () => {
    renderDialog()
    expect(
      screen.getByRole('button', { name: TRIGGER_LABEL }),
    ).toBeInTheDocument()
  })

  it('初期状態ではダイアログが閉じている', () => {
    renderDialog()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TRIGGER_LABEL }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('トリガーは aria-haspopup="dialog" を持つ', () => {
    renderDialog()
    expect(
      screen.getByRole('button', { name: TRIGGER_LABEL }),
    ).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('クリックでダイアログが開き、見出しと凡例内容が表示される', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'ランク（tier）の見方' }),
    ).toBeInTheDocument()
    // 凡例（TierLegend）の中身が見えている
    expect(
      screen.getByText(TIER_META.favorite.criteriaJa),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TRIGGER_LABEL }),
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('title を渡すと見出しが差し替わる', async () => {
    const user = userEvent.setup()
    renderDialog('ランクってなに？')
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }))
    expect(
      screen.getByRole('heading', { name: 'ランクってなに？' }),
    ).toBeInTheDocument()
  })

  it('開くと閉じるボタンにフォーカスが移る', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }))
    expect(screen.getByRole('button', { name: '閉じる' })).toHaveFocus()
  })

  it('Escape で閉じてトリガーへフォーカスが戻る', async () => {
    const user = userEvent.setup()
    renderDialog()
    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('閉じるボタンで閉じてトリガーへフォーカスが戻る', async () => {
    const user = userEvent.setup()
    renderDialog()
    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('バックドロップのクリックで閉じる', async () => {
    const user = userEvent.setup()
    const { container } = renderDialog()
    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // role=dialog の外側（オーバーレイ最外殻）をクリックして閉じる
    const dialog = screen.getByRole('dialog')
    const overlay = dialog.parentElement as HTMLElement
    expect(overlay).not.toBeNull()
    expect(container.contains(overlay)).toBe(true)
    await user.click(overlay)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
