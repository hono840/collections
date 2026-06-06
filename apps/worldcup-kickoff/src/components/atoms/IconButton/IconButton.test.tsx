import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Star } from 'lucide-react'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('label が aria-label として設定される', () => {
    render(
      <IconButton label="お気に入り">
        <Star />
      </IconButton>,
    )
    expect(
      screen.getByRole('button', { name: 'お気に入り' }),
    ).toBeInTheDocument()
  })

  it('アイコン（children）が表示される', () => {
    render(
      <IconButton label="お気に入り">
        <Star data-testid="icon" />
      </IconButton>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('デフォルト variant (ghost) のスタイルが適用される', () => {
    render(
      <IconButton label="ラベル">
        <Star />
      </IconButton>,
    )
    expect(screen.getByRole('button').className).toContain('text-text-muted')
  })

  it('solid variant のスタイルが適用される', () => {
    render(
      <IconButton label="ラベル" variant="solid">
        <Star />
      </IconButton>,
    )
    expect(screen.getByRole('button').className).toContain('bg-pitch-600')
  })

  it('タップ領域 44px 以上（h-11 以上）が保証される', () => {
    render(
      <IconButton label="ラベル">
        <Star />
      </IconButton>,
    )
    expect(screen.getByRole('button').className).toContain('h-11')
  })

  it('クリック時に onClick が呼ばれる', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <IconButton label="ラベル" onClick={handleClick}>
        <Star />
      </IconButton>,
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled の場合クリックしても onClick が呼ばれない', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(
      <IconButton label="ラベル" disabled onClick={handleClick}>
        <Star />
      </IconButton>,
    )
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
