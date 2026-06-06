import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuizOption } from './QuizOption'

describe('QuizOption', () => {
  it('ラベルが表示される', () => {
    render(<QuizOption label="攻撃的なサッカーが好き" />)
    expect(
      screen.getByRole('button', { name: /攻撃的なサッカーが好き/ }),
    ).toBeInTheDocument()
  })

  it('未選択時は aria-pressed が false', () => {
    render(<QuizOption label="テスト" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('selected 時は aria-pressed が true', () => {
    render(<QuizOption label="テスト" selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('クリックで onClick が呼ばれる', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<QuizOption label="テスト" onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled の場合クリックしても onClick が呼ばれない', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<QuizOption label="テスト" onClick={onClick} disabled />)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('44px 以上のタップ領域が確保される', () => {
    render(<QuizOption label="テスト" />)
    expect(screen.getByRole('button').className).toContain('min-h-[52px]')
  })
})
