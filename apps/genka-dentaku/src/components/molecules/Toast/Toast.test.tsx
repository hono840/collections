import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from './Toast'

describe('Toast', () => {
  it('is a polite status region carrying the message', () => {
    render(<Toast message="全メニューを再計算しました" />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('全メニューを再計算しました')
  })

  it('fires the inline action and the close control', async () => {
    const onAction = vi.fn()
    const onClose = vi.fn()
    render(
      <Toast message="サンプルを削除しました" tone="success" action={{ label: '元に戻す', onClick: onAction }} onClose={onClose} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '元に戻す' }))
    await userEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onAction).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
