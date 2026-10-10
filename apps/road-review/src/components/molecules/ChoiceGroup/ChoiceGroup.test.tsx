import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChoiceGroup } from './ChoiceGroup'

// Contract: ChoiceGroup<T extends string>({ name, legend, options: { value: T; label: string }[],
//   value: T | null, onChange(value: T), required?, error?, id? })
// fieldset + legend + native radio inputs (one tab stop, arrow keys move AND select: APG radio group).

const ROAD_TYPE_OPTIONS = [
  { value: 'pass', label: '峠' },
  { value: 'skyline', label: 'スカイライン' },
  { value: 'coastal', label: '海岸線' },
  { value: 'forest', label: '林道' },
  { value: 'other', label: 'その他' },
] as const
type RoadType = (typeof ROAD_TYPE_OPTIONS)[number]['value']

function Harness({ onChange = vi.fn(), initial = 'other' as RoadType | null, error }: {
  onChange?: (value: RoadType) => void
  initial?: RoadType | null
  error?: string
}) {
  const [value, setValue] = useState<RoadType | null>(initial)
  return (
    <ChoiceGroup
      name="roadType"
      legend="種別"
      options={[...ROAD_TYPE_OPTIONS]}
      value={value}
      error={error}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

describe('ChoiceGroup (fieldset + radios)', () => {
  it('is a group named by its legend, with one radio per option in order', () => {
    render(<Harness />)
    const group = screen.getByRole('group', { name: '種別' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual([
      'pass',
      'skyline',
      'coastal',
      'forest',
      'other',
    ])
    expect(within(group).getByRole('radio', { name: '林道' })).toBeInTheDocument()
  })

  it('checks the radio matching value', () => {
    render(<Harness initial="other" />)
    expect(screen.getByRole('radio', { name: 'その他' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '峠' })).not.toBeChecked()
  })

  it('checks nothing when value is null', () => {
    render(<Harness initial={null} />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('calls onChange with the option value on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: '林道' }))

    expect(onChange).toHaveBeenCalledWith('forest')
    expect(screen.getByRole('radio', { name: '林道' })).toBeChecked()
  })

  it('arrow keys move focus and select (keyboard operable)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} initial="pass" />)

    await user.click(screen.getByRole('radio', { name: '峠' }))
    onChange.mockClear()
    await user.keyboard('{ArrowDown}')

    const skyline = screen.getByRole('radio', { name: 'スカイライン' })
    expect(skyline).toBeChecked()
    expect(skyline).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith('skyline')
  })

  it('all radios share one name (single tab stop)', () => {
    render(<Harness />)
    const names = new Set(screen.getAllByRole('radio').map((radio) => radio.getAttribute('name')))
    expect(names.size).toBe(1)
  })

  it('shows the error and links it to the group', () => {
    render(<Harness initial={null} error="種別を選んでください" />)
    const group = screen.getByRole('group', { name: '種別' })
    expect(within(group).getByText('種別を選んでください')).toBeInTheDocument()
    expect(group).toHaveAccessibleDescription(expect.stringContaining('種別を選んでください'))
  })
})
