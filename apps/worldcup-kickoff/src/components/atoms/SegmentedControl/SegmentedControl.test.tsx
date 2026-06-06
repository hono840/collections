import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from './SegmentedControl'

const options = [
  { value: 'all', label: 'すべて' },
  { value: 'group', label: 'グループ' },
  { value: 'knockout', label: '決勝T' },
] as const

describe('SegmentedControl', () => {
  it('role=radiogroup と ariaLabel が設定される', () => {
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={() => {}}
        ariaLabel="日程フィルタ"
      />,
    )
    expect(
      screen.getByRole('radiogroup', { name: '日程フィルタ' }),
    ).toBeInTheDocument()
  })

  it('全オプションが radio として表示される', () => {
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={() => {}}
        ariaLabel="フィルタ"
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('選択中のオプションが aria-checked=true になる', () => {
    render(
      <SegmentedControl
        options={options}
        value="group"
        onChange={() => {}}
        ariaLabel="フィルタ"
      />,
    )
    expect(screen.getByRole('radio', { name: 'グループ' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('選択中のみ tabIndex=0、それ以外は -1（roving tabindex）', () => {
    render(
      <SegmentedControl
        options={options}
        value="group"
        onChange={() => {}}
        ariaLabel="フィルタ"
      />,
    )
    expect(screen.getByRole('radio', { name: 'グループ' })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(screen.getByRole('radio', { name: 'すべて' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })

  it('クリックで onChange が呼ばれる', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={handleChange}
        ariaLabel="フィルタ"
      />,
    )
    await user.click(screen.getByRole('radio', { name: '決勝T' }))
    expect(handleChange).toHaveBeenCalledWith('knockout')
  })

  it('右矢印キーで次のオプションへ移動し onChange が呼ばれる', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={handleChange}
        ariaLabel="フィルタ"
      />,
    )
    const first = screen.getByRole('radio', { name: 'すべて' })
    first.focus()
    await user.keyboard('{ArrowRight}')
    expect(handleChange).toHaveBeenCalledWith('group')
  })

  it('左矢印キーは末尾に循環する', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={handleChange}
        ariaLabel="フィルタ"
      />,
    )
    const first = screen.getByRole('radio', { name: 'すべて' })
    first.focus()
    await user.keyboard('{ArrowLeft}')
    expect(handleChange).toHaveBeenCalledWith('knockout')
  })

  it('タップ領域 44px 以上（min-h-11）が保証される', () => {
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={() => {}}
        ariaLabel="フィルタ"
      />,
    )
    expect(screen.getByRole('radio', { name: 'すべて' }).className).toContain(
      'min-h-11',
    )
  })
})
