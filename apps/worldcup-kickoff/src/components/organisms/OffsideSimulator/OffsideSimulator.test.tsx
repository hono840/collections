import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OffsideSimulator } from './OffsideSimulator'

/**
 * 判定ステータス表示（aria-live 領域）だけを返すヘルパー。
 * 「オフサイド」「オンサイド」はスライダーの aria 値や説明文にも現れるため、
 * スライダーの aria-describedby が指す判定結果コンテナに絞って検証する。
 */
function getStatusRegion(): HTMLElement {
  const slider = screen.getByRole('slider', { name: '攻撃側の選手の位置' })
  const resultId = slider.getAttribute('aria-describedby')
  expect(resultId).toBeTruthy()
  const region = document.getElementById(resultId as string)
  expect(region).not.toBeNull()
  return region as HTMLElement
}

describe('OffsideSimulator', () => {
  it('初期状態ではオンサイドと表示される', () => {
    render(<OffsideSimulator />)
    expect(within(getStatusRegion()).getByText(/オンサイド/)).toBeInTheDocument()
  })

  it('スライダーに role と aria 値が設定されている', () => {
    render(<OffsideSimulator />)
    const slider = screen.getByRole('slider', { name: '攻撃側の選手の位置' })
    expect(slider).toHaveAttribute('aria-valuemin')
    expect(slider).toHaveAttribute('aria-valuemax')
    expect(slider).toHaveAttribute('aria-valuenow')
  })

  it('右ボタンで攻撃側を前進させるとオフサイドになる', async () => {
    const user = userEvent.setup()
    render(<OffsideSimulator />)
    const forward = screen.getByRole('button', {
      name: '攻撃側を右（相手ゴール側）へ動かす',
    })
    // 50 → DFライン(64)を越えるまで複数回押す
    for (let i = 0; i < 6; i += 1) {
      await user.click(forward)
    }
    // 判定ステータスがオンサイド→オフサイドに変わったことを確認する。
    const status = getStatusRegion()
    expect(within(status).getByText(/オフサイド/)).toBeInTheDocument()
    expect(within(status).queryByText(/オンサイド/)).not.toBeInTheDocument()
  })

  it('リセットボタンで初期位置（オンサイド）に戻る', async () => {
    const user = userEvent.setup()
    render(<OffsideSimulator />)
    const forward = screen.getByRole('button', {
      name: '攻撃側を右（相手ゴール側）へ動かす',
    })
    for (let i = 0; i < 6; i += 1) {
      await user.click(forward)
    }
    await user.click(screen.getByRole('button', { name: 'リセット' }))
    const status = getStatusRegion()
    expect(within(status).getByText(/オンサイド/)).toBeInTheDocument()
    expect(within(status).queryByText(/オフサイド/)).not.toBeInTheDocument()
  })

  it('矢印キーでスライダーを操作できる', async () => {
    const user = userEvent.setup()
    render(<OffsideSimulator />)
    const slider = screen.getByRole('slider', { name: '攻撃側の選手の位置' })
    const before = Number(slider.getAttribute('aria-valuenow'))
    slider.focus()
    await user.keyboard('{ArrowRight}')
    const after = Number(slider.getAttribute('aria-valuenow'))
    expect(after).toBeGreaterThan(before)
  })
})
