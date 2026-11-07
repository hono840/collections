import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrefectureSelect } from './PrefectureSelect'

// Contract: PrefectureSelect({ id?, value: number | null, onChange(code: number | null), required?, error? })
// Label "都道府県" + <select> with an empty placeholder option and the 47 prefectures (north to south).

describe('PrefectureSelect', () => {
  it('is a labelled select with a placeholder + 47 prefectures in JIS order', () => {
    render(<PrefectureSelect value={null} onChange={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: /都道府県/ })
    const options = within(select).getAllByRole('option')
    expect(options).toHaveLength(48)
    expect(options[0]).toHaveValue('')
    expect(options[1]).toHaveTextContent('北海道')
    expect(options[1]).toHaveValue('1')
    expect(options[13]).toHaveTextContent('東京都')
    expect(options[47]).toHaveTextContent('沖縄県')
    expect(options[47]).toHaveValue('47')
  })

  it('shows the placeholder selected when value is null', () => {
    render(<PrefectureSelect value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /都道府県/ })).toHaveValue('')
  })

  it('reflects a selected code', () => {
    render(<PrefectureSelect value={10} onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /都道府県/ })).toHaveValue('10')
  })

  it('calls onChange with the numeric code', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PrefectureSelect value={null} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /都道府県/ }), '東京都')

    expect(onChange).toHaveBeenLastCalledWith(13)
  })

  it('calls onChange(null) when the placeholder is chosen again', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PrefectureSelect value={13} onChange={onChange} />)

    const select = screen.getByRole('combobox', { name: /都道府県/ })
    await user.selectOptions(select, within(select).getAllByRole('option')[0])

    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('shows "必須" when required', () => {
    render(<PrefectureSelect value={null} onChange={vi.fn()} required />)
    expect(screen.getByText('必須')).toBeInTheDocument()
  })

  it('marks the select invalid and describes it with the error', () => {
    render(<PrefectureSelect value={null} onChange={vi.fn()} error="都道府県を選んでください" />)
    const select = screen.getByRole('combobox', { name: /都道府県/ })
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription(expect.stringContaining('都道府県を選んでください'))
  })
})
