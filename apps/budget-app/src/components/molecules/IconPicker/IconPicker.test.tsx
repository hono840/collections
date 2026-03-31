import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconPicker } from './IconPicker'
import { ICON_MAP } from '@/components/molecules/CategoryIcon'

describe('IconPicker', () => {
  const defaultProps = {
    selectedIcon: 'utensils',
    color: '#ef4444',
    onSelect: vi.fn(),
  }

  it('全てのアイコンがボタンとして表示される', () => {
    render(<IconPicker {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(Object.keys(ICON_MAP).length)
  })

  it('選択中のアイコンにリングスタイルが適用される', () => {
    render(<IconPicker {...defaultProps} />)
    const selectedBtn = screen.getByTitle('utensils')
    expect(selectedBtn.className).toContain('ring-2')
  })

  it('未選択のアイコンにはリングスタイルが適用されない', () => {
    render(<IconPicker {...defaultProps} />)
    const otherBtn = screen.getByTitle('car')
    expect(otherBtn.className).not.toContain('ring-2')
  })

  it('アイコンをクリックすると onSelect が呼ばれる', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<IconPicker {...defaultProps} onSelect={onSelect} />)
    await user.click(screen.getByTitle('car'))
    expect(onSelect).toHaveBeenCalledWith('car')
  })

  it('各ボタンに title 属性としてアイコン名が設定されている', () => {
    render(<IconPicker {...defaultProps} />)
    expect(screen.getByTitle('utensils')).toBeInTheDocument()
    expect(screen.getByTitle('home')).toBeInTheDocument()
  })
})
