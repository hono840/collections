import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GSI_ATTRIBUTION, GSI_STD_TILE_URL } from '@/lib/map/gsi-tiles'
import {
  leafletState,
  liveMarkers,
  markerIconHtml,
  resetLeafletMock,
} from '../../../../tests/helpers/leaflet-mock'

vi.mock('leaflet', async () => (await import('../../../../tests/helpers/leaflet-mock')).leafletModule)

import { PinPicker } from './PinPicker'

// PinPicker (architecture 9.2-9.4). Client organism. Contract:
//   PinPicker({ start: LatLng | null, end: LatLng | null,
//               onChange(next: { start: LatLng | null; end: LatLng | null }): void,
//               startError?: string, endError?: string })
// - Leaflet is loaded inside useEffect via `await import('leaflet')` (SSR-safe); map.remove() on cleanup
// - ChoiceGroup "置くピン" (radios "開始" / "終了", default "開始") decides which pin a map click places
// - Keyboard alternatives: LatLngInputs "開始地点" / "終了地点" and the "地図の中心に置く" button
// - "終了ピンを消す" clears the end pin
// - GSI tiles + attribution; divIcon markers with the text 始 / 終; no geolocation / map.locate()
// - M-09 note is always shown near the map

type LatLng = { lat: number; lng: number }
type Pins = { start: LatLng | null; end: LatLng | null }

const M09 = 'ピンは道の上に置いてください。自宅など、道以外の場所には置かないでください。'

function Harness({ initial = { start: null, end: null }, onChange = vi.fn(), startError }: {
  initial?: Pins
  onChange?: (next: Pins) => void
  startError?: string
}) {
  const [pins, setPins] = useState<Pins>(initial)
  return (
    <PinPicker
      start={pins.start}
      end={pins.end}
      startError={startError}
      onChange={(next) => {
        setPins(next)
        onChange(next)
      }}
    />
  )
}

function group(name: RegExp) {
  return screen.getByRole('group', { name })
}

async function waitForMap() {
  await waitFor(() => expect(leafletState.maps).toHaveLength(1))
  return leafletState.maps[0]
}

beforeEach(() => {
  resetLeafletMock()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PinPicker', () => {
  it('creates one Leaflet map with GSI tiles and the GSI attribution', async () => {
    render(<Harness />)
    await waitForMap()

    expect(leafletState.tileLayers).toHaveLength(1)
    expect(leafletState.tileLayers[0].url).toBe(GSI_STD_TILE_URL)
    expect(leafletState.tileLayers[0].options.attribution).toBe(GSI_ATTRIBUTION)
  })

  it('keeps Leaflet keyboard navigation enabled', async () => {
    render(<Harness />)
    const map = await waitForMap()
    expect(map.options.keyboard).not.toBe(false)
  })

  it('always shows the M-09 pin note', () => {
    render(<Harness />)
    expect(screen.getByText(M09)).toBeInTheDocument()
  })

  it('typing start lat/lng sets the start pin (keyboard alternative)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    const startGroup = group(/開始地点/)
    await user.type(within(startGroup).getByLabelText(/緯度/), '36.35')
    await user.type(within(startGroup).getByLabelText(/経度/), '138.7')

    expect(onChange).toHaveBeenLastCalledWith({ start: { lat: 36.35, lng: 138.7 }, end: null })
  })

  it('typing end lat/lng sets the end pin and keeps the start pin', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness initial={{ start: { lat: 36.35, lng: 138.7 }, end: null }} onChange={onChange} />)

    const endGroup = group(/終了地点/)
    await user.type(within(endGroup).getByLabelText(/緯度/), '36.4')
    await user.type(within(endGroup).getByLabelText(/経度/), '138.65')

    expect(onChange).toHaveBeenLastCalledWith({
      start: { lat: 36.35, lng: 138.7 },
      end: { lat: 36.4, lng: 138.65 },
    })
  })

  it('"終了ピンを消す" clears the end pin and its inputs', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Harness
        initial={{ start: { lat: 36.35, lng: 138.7 }, end: { lat: 36.4, lng: 138.65 } }}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '終了ピンを消す' }))

    expect(onChange).toHaveBeenLastCalledWith({ start: { lat: 36.35, lng: 138.7 }, end: null })
    const endGroup = group(/終了地点/)
    expect(within(endGroup).getByLabelText(/緯度/)).toHaveDisplayValue('')
    expect(within(endGroup).getByLabelText(/経度/)).toHaveDisplayValue('')
  })

  it('"終了ピンを消す" is not operable when there is no end pin', () => {
    render(<Harness />)
    const button = screen.queryByRole('button', { name: '終了ピンを消す' })
    if (button) expect(button).toBeDisabled()
  })

  it('has a "置くピン" choice with 開始 selected by default', () => {
    render(<Harness />)
    const choice = group(/置くピン/)
    expect(within(choice).getByRole('radio', { name: '開始' })).toBeChecked()
    expect(within(choice).getByRole('radio', { name: '終了' })).not.toBeChecked()
  })

  it('a map click places the selected kind of pin', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const map = await waitForMap()

    act(() => {
      map.fire('click', { latlng: { lat: 36.3, lng: 138.6 } })
    })
    expect(onChange).toHaveBeenLastCalledWith({ start: { lat: 36.3, lng: 138.6 }, end: null })
    expect(within(group(/開始地点/)).getByLabelText(/緯度/)).toHaveDisplayValue('36.3')

    await user.click(within(group(/置くピン/)).getByRole('radio', { name: '終了' }))
    act(() => {
      map.fire('click', { latlng: { lat: 36.41, lng: 138.62 } })
    })
    expect(onChange).toHaveBeenLastCalledWith({
      start: { lat: 36.3, lng: 138.6 },
      end: { lat: 36.41, lng: 138.62 },
    })
  })

  it('"地図の中心に置く" places the selected pin at the map center (keyboard users pan with arrows)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const map = await waitForMap()
    map.getCenter.mockReturnValue({ lat: 35.5, lng: 139.1 })

    await user.click(screen.getByRole('button', { name: '地図の中心に置く' }))

    expect(onChange).toHaveBeenLastCalledWith({ start: { lat: 35.5, lng: 139.1 }, end: null })
  })

  it('draws divIcon markers labelled 始 (start) and 終 (end), not the default image icon', async () => {
    render(
      <Harness initial={{ start: { lat: 36.35, lng: 138.7 }, end: { lat: 36.4, lng: 138.65 } }} />,
    )
    await waitForMap()

    await waitFor(() => expect(liveMarkers()).toHaveLength(2))
    const icons = liveMarkers().map((marker) => markerIconHtml(marker))
    expect(icons.some((html) => html.includes('始'))).toBe(true)
    expect(icons.some((html) => html.includes('終'))).toBe(true)
    const positions = liveMarkers().map((marker) => marker.state.latlng)
    expect(positions).toEqual(
      expect.arrayContaining([
        { lat: 36.35, lng: 138.7 },
        { lat: 36.4, lng: 138.65 },
      ]),
    )
  })

  it('moves/removes markers when the pins change', async () => {
    const user = userEvent.setup()
    render(
      <Harness initial={{ start: { lat: 36.35, lng: 138.7 }, end: { lat: 36.4, lng: 138.65 } }} />,
    )
    await waitForMap()
    await waitFor(() => expect(liveMarkers()).toHaveLength(2))

    await user.click(screen.getByRole('button', { name: '終了ピンを消す' }))

    await waitFor(() => expect(liveMarkers()).toHaveLength(1))
    expect(markerIconHtml(liveMarkers()[0])).toContain('始')
  })

  it('shows the start pin error', () => {
    render(<Harness startError="地図を動かして開始地点のピンを置いてください" />)
    expect(
      within(group(/開始地点/)).getByText('地図を動かして開始地点のピンを置いてください'),
    ).toBeInTheDocument()
  })

  it('never asks for the current location (no map.locate / navigator.geolocation)', async () => {
    const getCurrentPosition = vi.fn()
    const watchPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition, watchPosition, clearWatch: vi.fn() },
    })
    render(<Harness />)
    const map = await waitForMap()

    expect(map.locate).not.toHaveBeenCalled()
    expect(getCurrentPosition).not.toHaveBeenCalled()
    expect(watchPosition).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /現在地/ })).not.toBeInTheDocument()
  })

  it('removes the map on unmount (no "already initialized" in StrictMode)', async () => {
    const { unmount } = render(<Harness />)
    const map = await waitForMap()

    unmount()

    expect(map.remove).toHaveBeenCalled()
  })
})
