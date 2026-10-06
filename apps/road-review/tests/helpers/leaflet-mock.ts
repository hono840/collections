/**
 * Test double for Leaflet (jsdom cannot render Leaflet maps).
 *
 * Usage in a component test:
 *   vi.mock('leaflet', async () => (await import('<relative>/tests/helpers/leaflet-mock')).leafletModule)
 *   import { leafletState, resetLeafletMock } from '<relative>/tests/helpers/leaflet-mock'
 *
 * Works with `(await import('leaflet')).default` and with named imports.
 * Unknown methods on map/marker/layers are chainable no-op spies, so implementations are free to use
 * other Leaflet APIs (bindTooltip, setIcon, layerGroup, ...). Only the methods the tests assert on
 * have real behaviour.
 */
import { vi, type Mock } from 'vitest'

export type LatLngLike = [number, number] | { lat: number; lng: number }
type Handler = (event: unknown) => void

/** Normalises [lat, lng] / { lat, lng } to { lat, lng }. */
export function toLatLng(value: LatLngLike): { lat: number; lng: number } {
  return Array.isArray(value) ? { lat: value[0], lng: value[1] } : { lat: value.lat, lng: value.lng }
}

/** Wraps an object so any missing method is a cached spy that returns the proxy (chainable). */
function chainable<T extends object>(base: T): T & Record<string, Mock> {
  const extra = new Map<PropertyKey, Mock>()
  const proxy: T & Record<string, Mock> = new Proxy(base, {
    get(target, property, receiver) {
      if (property in target) return Reflect.get(target, property, receiver)
      // Never look like a Promise / React element / iterable.
      if (property === 'then' || typeof property === 'symbol' || property === '$$typeof') return undefined
      if (!extra.has(property)) extra.set(property, vi.fn(() => proxy))
      return extra.get(property)
    },
  }) as T & Record<string, Mock>
  return proxy
}

export type FakeMap = ReturnType<typeof createFakeMap>
export type FakeMarker = ReturnType<typeof createFakeMarker>

export const leafletState = {
  maps: [] as FakeMap[],
  markers: [] as FakeMarker[],
  tileLayers: [] as { url: string; options: Record<string, unknown> }[],
  divIcons: [] as Record<string, unknown>[],
}

function createFakeMap(element: unknown, options: Record<string, unknown> = {}) {
  const handlers = new Map<string, Handler[]>()
  const state = {
    center: options.center ? toLatLng(options.center as LatLngLike) : { lat: 0, lng: 0 },
    zoom: (options.zoom as number | undefined) ?? 0,
  }
  const map = chainable({
    element,
    options,
    state,
    handlers,
    on: vi.fn((type: string, handler: Handler) => {
      for (const name of type.split(/\s+/)) handlers.set(name, [...(handlers.get(name) ?? []), handler])
      return map
    }),
    off: vi.fn(() => map),
    /** Test helper: dispatches a Leaflet event to the registered handlers. */
    fire(type: string, event: unknown = {}) {
      for (const handler of handlers.get(type) ?? []) handler(event)
      return map
    },
    setView: vi.fn((center: LatLngLike, zoom?: number) => {
      state.center = toLatLng(center)
      if (zoom !== undefined) state.zoom = zoom
      return map
    }),
    getCenter: vi.fn(() => ({ ...state.center })),
    getZoom: vi.fn(() => state.zoom),
    fitBounds: vi.fn(() => map),
    remove: vi.fn(() => map),
    locate: vi.fn(() => map),
    whenReady: vi.fn((callback?: () => void) => {
      callback?.()
      return map
    }),
  })
  return map
}

function createFakeMarker(latlng: LatLngLike, options: Record<string, unknown> = {}) {
  const state = { latlng: toLatLng(latlng), removed: false, popup: undefined as unknown }
  const marker = chainable({
    options,
    state,
    addTo: vi.fn(() => marker),
    remove: vi.fn(() => {
      state.removed = true
      return marker
    }),
    setLatLng: vi.fn((next: LatLngLike) => {
      state.latlng = toLatLng(next)
      return marker
    }),
    getLatLng: vi.fn(() => ({ ...state.latlng })),
    bindPopup: vi.fn((content: unknown) => {
      state.popup = content
      return marker
    }),
  })
  return marker
}

const L = {
  map: vi.fn((element: unknown, options?: Record<string, unknown>) => {
    const map = createFakeMap(element, options)
    leafletState.maps.push(map)
    return map
  }),
  tileLayer: vi.fn((url: string, options: Record<string, unknown> = {}) => {
    leafletState.tileLayers.push({ url, options })
    return chainable({ url, options })
  }),
  marker: vi.fn((latlng: LatLngLike, options?: Record<string, unknown>) => {
    const marker = createFakeMarker(latlng, options)
    leafletState.markers.push(marker)
    return marker
  }),
  divIcon: vi.fn((options: Record<string, unknown> = {}) => {
    leafletState.divIcons.push(options)
    return { __divIcon: true, options }
  }),
  latLng: vi.fn((lat: number, lng: number) => ({ lat, lng })),
  latLngBounds: vi.fn((points: unknown) => chainable({ points })),
  layerGroup: vi.fn(() => chainable({})),
  featureGroup: vi.fn(() => chainable({})),
  control: chainable({}),
}

export const leafletModule = { default: L, ...L }
export const leafletFake = L

export function resetLeafletMock() {
  leafletState.maps.length = 0
  leafletState.markers.length = 0
  leafletState.tileLayers.length = 0
  leafletState.divIcons.length = 0
  for (const factory of [L.map, L.tileLayer, L.marker, L.divIcon, L.latLng, L.latLngBounds, L.layerGroup, L.featureGroup]) {
    factory.mockClear()
  }
}

/** Markers that are still on the map (created and not removed). */
export function liveMarkers(): FakeMarker[] {
  return leafletState.markers.filter((marker) => !marker.state.removed)
}

/** Returns popup content as HTML text, whether it was bound as a string, an element or a function. */
export function popupHtml(marker: FakeMarker): string {
  let content = marker.state.popup
  if (typeof content === 'function') content = (content as () => unknown)()
  if (typeof content === 'string') return content
  if (content && typeof content === 'object' && 'outerHTML' in content) {
    return (content as HTMLElement).outerHTML
  }
  return ''
}

/** HTML of a marker's divIcon (empty string when the default image icon is used). */
export function markerIconHtml(marker: FakeMarker): string {
  const icon = marker.options.icon as { __divIcon?: boolean; options?: { html?: unknown } } | undefined
  if (!icon?.__divIcon) return ''
  const html = icon.options?.html
  if (typeof html === 'string') return html
  if (html && typeof html === 'object' && 'outerHTML' in html) return (html as HTMLElement).outerHTML
  return ''
}
