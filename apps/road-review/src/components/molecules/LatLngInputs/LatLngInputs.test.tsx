import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LatLngInputs } from './LatLngInputs'

// Contract: LatLngInputs({ idPrefix, legend, value: { lat: number; lng: number } | null,
//   onChange(value: { lat: number; lng: number } | null), required?, error? })
// Keyboard/no-map alternative to the map (architecture 9.4). fieldset(legend) + 2 numeric inputs "緯度" / "経度".
// onChange receives a full pair once both inputs hold numbers, and null when either is emptied.
// Range checks are NOT done here (zod does that on submit).

type LatLng = { lat: number; lng: number }

function Controlled({ initial = null, onChange = vi.fn() }: { initial?: LatLng | null; onChange?: (value: LatLng | null) => void }) {
  const [value, setValue] = useState<LatLng | null>(initial)
  return (
    <>
      <LatLngInputs
        idPrefix="start"
        legend="開始地点"
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
      />
      <button type="button" onClick={() => setValue({ lat: 35.123456, lng: 139.654321 })}>
        外から設定
      </button>
    </>
  )
}

function inputsOf(legend = '開始地点') {
  const group = screen.getByRole('group', { name: new RegExp(legend) })
  return {
    group,
    lat: within(group).getByLabelText(/緯度/),
    lng: within(group).getByLabelText(/経度/),
  }
}

describe('LatLngInputs', () => {
  it('renders a group named by the legend with 緯度 and 経度 inputs', () => {
    render(<LatLngInputs idPrefix="start" legend="開始地点" value={null} onChange={vi.fn()} />)
    const { lat, lng } = inputsOf()
    expect(lat).toHaveDisplayValue('')
    expect(lng).toHaveDisplayValue('')
    expect(lat.id).not.toBe(lng.id)
  })

  it('uses idPrefix so two instances on one page do not clash', () => {
    render(
      <>
        <LatLngInputs idPrefix="start" legend="開始地点" value={null} onChange={vi.fn()} />
        <LatLngInputs idPrefix="end" legend="終了地点" value={null} onChange={vi.fn()} />
      </>,
    )
    const ids = [inputsOf('開始地点').lat, inputsOf('開始地点').lng, inputsOf('終了地点').lat, inputsOf('終了地点').lng].map(
      (input) => input.id,
    )
    expect(new Set(ids).size).toBe(4)
  })

  it('shows the given value', () => {
    render(
      <LatLngInputs idPrefix="start" legend="開始地点" value={{ lat: 36.35, lng: 138.7 }} onChange={vi.fn()} />,
    )
    const { lat, lng } = inputsOf()
    expect(lat).toHaveDisplayValue('36.35')
    expect(lng).toHaveDisplayValue('138.7')
  })

  it('emits a full pair once both numbers are typed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    const { lat, lng } = inputsOf()

    await user.type(lat, '36.35')
    expect(onChange.mock.calls.every(([value]) => value === null)).toBe(true)

    await user.type(lng, '138.7')
    expect(onChange).toHaveBeenLastCalledWith({ lat: 36.35, lng: 138.7 })
  })

  it('keeps a half-typed value while the parent value is still null', async () => {
    const user = userEvent.setup()
    render(<Controlled />)
    const { lat } = inputsOf()

    await user.type(lat, '36.35')

    expect(lat).toHaveDisplayValue('36.35')
  })

  it('emits null when one of the inputs is cleared', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Controlled initial={{ lat: 36.35, lng: 138.7 }} onChange={onChange} />)

    await user.clear(inputsOf().lng)

    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('follows value changes coming from outside (e.g. the map)', async () => {
    const user = userEvent.setup()
    render(<Controlled />)

    await user.click(screen.getByRole('button', { name: '外から設定' }))

    const { lat, lng } = inputsOf()
    expect(lat).toHaveDisplayValue('35.123456')
    expect(lng).toHaveDisplayValue('139.654321')
  })

  it('shows the error and marks both inputs invalid', () => {
    render(
      <LatLngInputs
        idPrefix="start"
        legend="開始地点"
        value={null}
        onChange={vi.fn()}
        error="地図を動かして開始地点のピンを置いてください"
      />,
    )
    const { group, lat, lng } = inputsOf()
    expect(within(group).getByText('地図を動かして開始地点のピンを置いてください')).toBeInTheDocument()
    expect(lat).toHaveAttribute('aria-invalid', 'true')
    expect(lng).toHaveAttribute('aria-invalid', 'true')
    expect(lat).toHaveAccessibleDescription(
      expect.stringContaining('地図を動かして開始地点のピンを置いてください'),
    )
  })

  it('accepts decimals (step allows 6 decimal places or any)', () => {
    render(<LatLngInputs idPrefix="start" legend="開始地点" value={null} onChange={vi.fn()} />)
    const { lat } = inputsOf()
    const step = lat.getAttribute('step')
    if (step !== null) expect(['any', '0.000001']).toContain(step)
  })
})
