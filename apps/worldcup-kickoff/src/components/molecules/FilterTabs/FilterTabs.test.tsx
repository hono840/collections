import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterTabs } from './FilterTabs'

const options = [
  { value: 'all', label: 'すべて' },
  { value: 'group', label: 'グループ' },
  { value: 'knockout', label: '決勝T' },
] as const

describe('FilterTabs', () => {
  it('全タブが表示される', () => {
    render(
      <FilterTabs
        options={options}
        value="all"
        onChange={() => {}}
        ariaLabel="ステージで絞り込み"
      />,
    )
    expect(screen.getByRole('radio', { name: 'すべて' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'グループ' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '決勝T' })).toBeInTheDocument()
  })

  it('現在値の radio が選択状態になる', () => {
    render(
      <FilterTabs
        options={options}
        value="group"
        onChange={() => {}}
        ariaLabel="ステージで絞り込み"
      />,
    )
    expect(screen.getByRole('radio', { name: 'グループ' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('タブクリックで onChange が呼ばれる', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <FilterTabs
        options={options}
        value="all"
        onChange={onChange}
        ariaLabel="ステージで絞り込み"
      />,
    )
    await user.click(screen.getByRole('radio', { name: '決勝T' }))
    expect(onChange).toHaveBeenCalledWith('knockout')
  })

  it('radiogroup に aria-label が付与される', () => {
    render(
      <FilterTabs
        options={options}
        value="all"
        onChange={() => {}}
        ariaLabel="ステージで絞り込み"
      />,
    )
    expect(
      screen.getByRole('radiogroup', { name: 'ステージで絞り込み' }),
    ).toBeInTheDocument()
  })

  it('scrollable でも全タブが表示される', () => {
    render(
      <FilterTabs
        options={options}
        value="all"
        onChange={() => {}}
        ariaLabel="ステージで絞り込み"
        scrollable
      />,
    )
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })
})
