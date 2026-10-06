import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  GSI_ATTRIBUTION,
  GSI_STD_TILE_URL,
  JAPAN_CENTER,
  JAPAN_DEFAULT_ZOOM,
} from '@/lib/map/gsi-tiles'
import type { RoadSummary } from '@/types/road'
import {
  leafletState,
  liveMarkers,
  markerIconHtml,
  popupHtml,
  resetLeafletMock,
} from '../../../../tests/helpers/leaflet-mock'

vi.mock('leaflet', async () => (await import('../../../../tests/helpers/leaflet-mock')).leafletModule)

const navigation = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}))

import { RoadsMap } from './RoadsMap'

// RoadsMap (architecture 9.5, US-06). Client organism, display only. Contract:
//   RoadsMap({ roads: RoadSummary[] })
// - one start-pin marker per road (divIcon; title = road name; keyboard reachable)
// - marker popup: road name + link "詳細を見る" to /roads/<id> (name escaped)
// - fitBounds over all pins; 0 roads -> whole Japan (JAPAN_CENTER / JAPAN_DEFAULT_ZOOM)
// - container aria-label "道の地図（同じ内容は下のリストにあります）"
// - P-4 (architecture ch.19.1): the popup link "詳細を見る" navigates client-side with
//   useRouter().push('/roads/<id>') and prevents the default full-page navigation. The popup content
//   is bound as an HTMLElement (or a function returning one) whose link handles the click itself.

const MAP_LABEL = '道の地図（同じ内容は下のリストにあります）'

function road(overrides: Partial<RoadSummary>): RoadSummary {
  return {
    id: '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b',
    name: '碓氷峠',
    prefectureCode: 10,
    roadType: 'pass',
    start: { lat: 36.35, lng: 138.7 },
    end: { lat: 36.4, lng: 138.65 },
    createdAt: '2026-10-07T03:00:00+00:00',
    lastDrivenOn: null,
    lastRatingOverall: null,
    driveCount: 0,
    ...overrides,
  }
}

const roads: RoadSummary[] = [
  road({}),
  road({
    id: '11111111-2222-4333-8444-555555555555',
    name: '房総フラワーライン',
    prefectureCode: 12,
    roadType: 'coastal',
    start: { lat: 34.92, lng: 139.83 },
    end: null,
  }),
  road({
    id: '22222222-3333-4444-8555-666666666666',
    name: '伊豆スカイライン',
    prefectureCode: 22,
    roadType: 'skyline',
    start: { lat: 35.1, lng: 139.0 },
    end: null,
  }),
]

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

describe('RoadsMap', () => {
  it('labels the map region and says the same content is in the list', () => {
    render(<RoadsMap roads={roads} />)
    expect(screen.getByLabelText(MAP_LABEL)).toBeInTheDocument()
  })

  it('uses GSI tiles with the attribution', async () => {
    render(<RoadsMap roads={roads} />)
    await waitForMap()
    expect(leafletState.tileLayers).toHaveLength(1)
    expect(leafletState.tileLayers[0].url).toBe(GSI_STD_TILE_URL)
    expect(leafletState.tileLayers[0].options.attribution).toBe(GSI_ATTRIBUTION)
  })

  it('puts exactly one marker per road (marker count == list count) at each start point', async () => {
    render(<RoadsMap roads={roads} />)
    await waitForMap()

    await waitFor(() => expect(liveMarkers()).toHaveLength(roads.length))
    expect(liveMarkers().map((marker) => marker.state.latlng)).toEqual(
      expect.arrayContaining(roads.map((item) => item.start)),
    )
  })

  it('markers carry the road name as title and stay keyboard reachable', async () => {
    render(<RoadsMap roads={roads} />)
    await waitForMap()
    await waitFor(() => expect(liveMarkers()).toHaveLength(roads.length))

    const titles = liveMarkers().map((marker) => marker.options.title)
    expect(titles).toEqual(expect.arrayContaining(roads.map((item) => item.name)))
    for (const marker of liveMarkers()) expect(marker.options.keyboard).not.toBe(false)
  })

  it('uses divIcon markers (no bundler-broken default image icon)', async () => {
    render(<RoadsMap roads={roads} />)
    await waitForMap()
    await waitFor(() => expect(liveMarkers()).toHaveLength(roads.length))
    for (const marker of liveMarkers()) expect(markerIconHtml(marker)).not.toBe('')
  })

  it('each marker popup shows the name and a "詳細を見る" link to the detail page', async () => {
    render(<RoadsMap roads={roads} />)
    await waitForMap()
    await waitFor(() => expect(liveMarkers()).toHaveLength(roads.length))

    for (const item of roads) {
      const marker = liveMarkers().find((candidate) => candidate.options.title === item.name)
      expect(marker).toBeDefined()
      const container = document.createElement('div')
      container.innerHTML = popupHtml(marker!)
      expect(container.textContent).toContain(item.name)
      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe(`/roads/${item.id}`)
      expect(link?.textContent).toContain('詳細を見る')
    }
  })

  it('escapes road names inside the popup (no HTML injection)', async () => {
    const evil = road({ name: '<img src=x onerror=alert(1)>' })
    render(<RoadsMap roads={[evil]} />)
    await waitForMap()
    await waitFor(() => expect(liveMarkers()).toHaveLength(1))

    const container = document.createElement('div')
    container.innerHTML = popupHtml(liveMarkers()[0])
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('fits the view to all pins', async () => {
    render(<RoadsMap roads={roads} />)
    const map = await waitForMap()
    await waitFor(() => expect(map.fitBounds).toHaveBeenCalled())
  })

  it('with 0 roads shows all of Japan and no markers', async () => {
    render(<RoadsMap roads={[]} />)
    const map = await waitForMap()

    await waitFor(() => expect(map.state.center).toEqual({ lat: JAPAN_CENTER[0], lng: JAPAN_CENTER[1] }))
    expect(map.state.zoom).toBe(JAPAN_DEFAULT_ZOOM)
    expect(liveMarkers()).toHaveLength(0)
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('never calls map.locate()', async () => {
    render(<RoadsMap roads={roads} />)
    const map = await waitForMap()
    expect(map.locate).not.toHaveBeenCalled()
  })

  it('removes the map on unmount', async () => {
    const { unmount } = render(<RoadsMap roads={roads} />)
    const map = await waitForMap()
    unmount()
    expect(map.remove).toHaveBeenCalled()
  })

  it('P-4: clicking "詳細を見る" in a popup uses router.push and prevents the full page load', async () => {
    render(<RoadsMap roads={roads} />)
    await waitForMap()
    await waitFor(() => expect(liveMarkers()).toHaveLength(roads.length))

    const target = roads[1]
    const marker = liveMarkers().find((candidate) => candidate.options.title === target.name)!
    let content = marker.state.popup
    if (typeof content === 'function') content = (content as () => unknown)()
    expect(content).toBeInstanceOf(HTMLElement)
    const popup = content as HTMLElement
    document.body.append(popup) // Leaflet would mount the content when the popup opens
    const link = Array.from(popup.querySelectorAll('a')).find((anchor) => anchor.textContent?.includes('詳細を見る'))
    expect(link).toBeDefined()

    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    link!.dispatchEvent(click)

    expect(click.defaultPrevented).toBe(true)
    expect(navigation.push).toHaveBeenCalledTimes(1)
    expect(navigation.push).toHaveBeenCalledWith(`/roads/${target.id}`)
    popup.remove()
  })
})
