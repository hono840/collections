import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'

describe('Dialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: 'テストダイアログ',
    children: <p>ダイアログの内容</p>,
  }

  // --- 開閉テスト ---

  it('open=true の場合ダイアログが表示される', () => {
    render(<Dialog {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('ダイアログの内容')).toBeInTheDocument()
  })

  it('open=false の場合ダイアログが表示されない', () => {
    render(<Dialog {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // --- タイトル ---

  it('タイトルが表示される', () => {
    render(<Dialog {...defaultProps} />)
    expect(screen.getByText('テストダイアログ')).toBeInTheDocument()
  })

  it('タイトルが未指定の場合はヘッダーが表示されない', () => {
    render(<Dialog {...defaultProps} title={undefined} />)
    expect(screen.queryByText('テストダイアログ')).not.toBeInTheDocument()
    // 閉じるボタンも表示されない
    expect(screen.queryByLabelText('閉じる')).not.toBeInTheDocument()
  })

  // --- ESC キーで閉じる ---

  it('ESC キーで onClose が呼ばれる', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Dialog {...defaultProps} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // --- オーバーレイクリックで閉じる ---

  it('オーバーレイをクリックすると onClose が呼ばれる', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Dialog {...defaultProps} onClose={onClose} />)
    // aria-hidden="true" のオーバーレイ要素をクリック
    const overlay = document.querySelector('[aria-hidden="true"]')!
    await user.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // --- 閉じるボタン ---

  it('閉じるボタンをクリックすると onClose が呼ばれる', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Dialog {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByLabelText('閉じる'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // --- body overflow ---

  it('open 時に body の overflow が hidden になる', () => {
    render(<Dialog {...defaultProps} />)
    expect(document.body.style.overflow).toBe('hidden')
  })

  // --- aria 属性 ---

  it('aria-modal と aria-label が正しく設定される', () => {
    render(<Dialog {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'テストダイアログ')
  })
})
