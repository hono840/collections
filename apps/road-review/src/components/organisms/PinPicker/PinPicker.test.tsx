import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GSI_ATTRIBUTION, GSI_STD_TILE_URL } from '@/lib/map/gsi-tiles'
import {
  leafletFake,
  leafletState,
  liveMarkers,
  markerIconHtml,
  resetLeafletMock,
  toLatLng,
  type LatLngLike,
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
// Sprint 2 review follow-ups (architecture ch.19.1):
// - P-1: whenever a pin's coordinates change (not only on creation), pan to it if it is outside the
//        current view (map.getBounds().contains(point) === false -> map.panTo(point)).
//        Coordinates outside JAPAN_BOUNDS (lat 20-46, lng 122-154) create no marker, do not move an
//        existing marker and do not pan.
// - P-2: picker markers are created with { keyboard: false, interactive: false }.
// - P-3: a center crosshair inside the map wrapper (sibling of the Leaflet container), aria-hidden="true",
//        not catching pointer events (class "pointer-events-none" or style pointer-events: none).

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

const isInJapan = ({ lat, lng }: LatLng) => lat >= 20 && lat <= 46 && lng >= 122 && lng <= 154

function panTargets(map: Awaited<ReturnType<typeof waitForMap>>) {
  return map.panTo.mock.calls.map(([target]) => toLatLng(target as LatLngLike))
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

  describe('P-1: pan to typed coordinates / ignore coordinates outside Japan', () => {
    it('typing lng one character at a time: no marker or pan for out-of-Japan values, last pan = final point', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      const map = await waitForMap()
      map.bounds.contains.mockReturnValue(false) // every typed point is outside the current view

      const startGroup = group(/開始地点/)
      await user.type(within(startGroup).getByLabelText(/緯度/), '36.35')
      const lngInput = within(startGroup).getByLabelText(/経度/)
      await user.type(lngInput, '1') // lng 1: outside Japan
      await user.type(lngInput, '3') // lng 13: outside Japan

      expect(leafletState.markers).toHaveLength(0)
      expect(map.panTo).not.toHaveBeenCalled()

      await user.type(lngInput, '8') // lng 138
      await user.type(lngInput, '.7') // lng 138.7

      await waitFor(() => expect(liveMarkers()).toHaveLength(1))
      expect(liveMarkers()[0].state.latlng).toEqual({ lat: 36.35, lng: 138.7 })
      // No marker was ever created at an out-of-Japan point.
      for (const [created] of leafletFake.marker.mock.calls) expect(isInJapan(toLatLng(created))).toBe(true)
      for (const marker of leafletState.markers) {
        for (const [moved] of marker.setLatLng.mock.calls) expect(isInJapan(toLatLng(moved as LatLngLike))).toBe(true)
      }
      // Never panned to an out-of-Japan point; the last pan targets the final coordinate.
      const targets = panTargets(map)
      expect(targets.length).toBeGreaterThan(0)
      for (const target of targets) expect(isInJapan(target)).toBe(true)
      expect(targets.at(-1)).toEqual({ lat: 36.35, lng: 138.7 })
    })

    it('edit mode: an out-of-Japan input does not move the existing marker or pan', async () => {
      render(<Harness initial={{ start: { lat: 36.35, lng: 138.7 }, end: null }} />)
      const map = await waitForMap()
      await waitFor(() => expect(liveMarkers()).toHaveLength(1))
      map.bounds.contains.mockReturnValue(false)
      map.panTo.mockClear()
      const marker = liveMarkers()[0]
      marker.setLatLng.mockClear()

      fireEvent.change(within(group(/開始地点/)).getByLabelText(/経度/), { target: { value: '1' } })

      expect(liveMarkers()).toEqual([marker])
      expect(marker.state.latlng).toEqual({ lat: 36.35, lng: 138.7 })
      expect(marker.setLatLng).not.toHaveBeenCalled()
      expect(map.panTo).not.toHaveBeenCalled()
      expect(leafletState.markers).toHaveLength(1)
    })

    it('edit mode: a new in-Japan coordinate outside the current view moves the marker and pans to it', async () => {
      render(<Harness initial={{ start: { lat: 36.35, lng: 138.7 }, end: null }} />)
      const map = await waitForMap()
      await waitFor(() => expect(liveMarkers()).toHaveLength(1))
      map.bounds.contains.mockReturnValue(false)
      map.panTo.mockClear()

      fireEvent.change(within(group(/開始地点/)).getByLabelText(/経度/), { target: { value: '139.5' } })

      await waitFor(() => expect(liveMarkers()[0].state.latlng).toEqual({ lat: 36.35, lng: 139.5 }))
      expect(leafletState.markers).toHaveLength(1) // moved, not re-created
      expect(panTargets(map).at(-1)).toEqual({ lat: 36.35, lng: 139.5 })
    })

    it('does not pan when the changed pin is already in view', async () => {
      render(<Harness initial={{ start: { lat: 36.35, lng: 138.7 }, end: null }} />)
      const map = await waitForMap()
      await waitFor(() => expect(liveMarkers()).toHaveLength(1))
      map.bounds.contains.mockReturnValue(true)
      map.panTo.mockClear()

      fireEvent.change(within(group(/開始地点/)).getByLabelText(/経度/), { target: { value: '138.71' } })

      await waitFor(() => expect(liveMarkers()[0].state.latlng).toEqual({ lat: 36.35, lng: 138.71 }))
      expect(map.panTo).not.toHaveBeenCalled()
    })
  })

  it('P-2: picker markers are not interactive and not keyboard-focusable', async () => {
    render(
      <Harness initial={{ start: { lat: 36.35, lng: 138.7 }, end: { lat: 36.4, lng: 138.65 } }} />,
    )
    await waitForMap()
    await waitFor(() => expect(liveMarkers()).toHaveLength(2))

    for (const marker of liveMarkers()) {
      expect(marker.options.keyboard).toBe(false)
      expect(marker.options.interactive).toBe(false)
    }
  })

  it('P-3: shows a decorative center crosshair inside the map wrapper that ignores pointer events', () => {
    render(<Harness />)
    const mapRegion = screen.getByRole('region', { name: /ピンを置く地図/ })
    const wrapper = mapRegion.parentElement!

    const crosshairs = Array.from(wrapper.querySelectorAll<HTMLElement>('[aria-hidden="true"]')).filter(
      (element) => !mapRegion.contains(element),
    )
    expect(crosshairs.length).toBeGreaterThan(0)
    expect(
      crosshairs.some(
        (element) =>
          element.className.toString().includes('pointer-events-none') || element.style.pointerEvents === 'none',
      ),
    ).toBe(true)
  })
})
