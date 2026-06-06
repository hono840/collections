import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

describe('Chip', () => {
  it('children が正しく表示される', () => {
    render(<Chip>アジア</Chip>)
    expect(screen.getByRole('button', { name: 'アジア' })).toBeInTheDocument()
  })

  it('未選択時は aria-pressed が false', () => {
    render(<Chip>テスト</Chip>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('selected 時は aria-pressed が true', () => {
    render(<Chip selected>テスト</Chip>)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('selected 時に選択スタイルが適用される', () => {
    render(<Chip selected>テスト</Chip>)
    expect(screen.getByRole('button').className).toContain('bg-pitch-600')
  })

  it('タップ領域 44px 以上（min-h-11）が保証される', () => {
    render(<Chip>テスト</Chip>)
    expect(screen.getByRole('button').className).toContain('min-h-11')
  })

  it('クリック時に onClick が呼ばれる', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Chip onClick={handleClick}>テスト</Chip>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled の場合クリックしても onClick が呼ばれない', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <Chip disabled onClick={handleClick}>
        テスト
      </Chip>,
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
