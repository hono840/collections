'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'
import { Crosshair } from 'lucide-react'
import { Plus } from 'lucide-react'
import { X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { ChoiceGroup } from '@/components/molecules/ChoiceGroup'
import { LatLngInputs } from '@/components/molecules/LatLngInputs'
import {
  GSI_ATTRIBUTION,
  GSI_MAX_ZOOM,
  GSI_MIN_ZOOM,
  GSI_STD_TILE_URL,
  JAPAN_CENTER,
  JAPAN_DEFAULT_ZOOM,
} from '@/lib/map/gsi-tiles'
import { JAPAN_BOUNDS } from '@/lib/validation/road'
import type { LatLng } from '@/types/road'
import { cn } from '@/lib/utils/cn'

export type Pins = { start: LatLng | null; end: LatLng | null }

export type PinPickerProps = Pins & {
  onChange: (next: Pins) => void
  startError?: string
  endError?: string
  className?: string
}

type PinKind = 'start' | 'end'

const PIN_KIND_OPTIONS = [
  { value: 'start', label: '開始' },
  { value: 'end', label: '終了' },
] as const satisfies ReadonlyArray<{ value: PinKind; label: string }>

/** M-09 */
const PIN_NOTE = 'ピンは道の上に置いてください。自宅など、道以外の場所には置かないでください。'

const PIN_ZOOM = 13

/** Above the tile pane (200) and overlay pane (400), below the marker pane (600) and controls. */
const CROSSHAIR_Z_INDEX = 450
/** White ring + pin shadow (spec tokens) so the crosshair reads on both light and dark tiles. */
const CROSSHAIR_HALO = 'drop-shadow(0 0 1px var(--color-pin-ring)) drop-shadow(var(--shadow-pin))'

/** Same range as the zod schema: half-typed values such as lng "13" are ignored on the map. */
function isInJapan(point: LatLng): boolean {
  return (
    point.lat >= JAPAN_BOUNDS.minLat &&
    point.lat <= JAPAN_BOUNDS.maxLat &&
    point.lng >= JAPAN_BOUNDS.minLng &&
    point.lng <= JAPAN_BOUNDS.maxLng
  )
}

function samePoint(left: LatLng | null, right: LatLng | null): boolean {
  return left?.lat === right?.lat && left?.lng === right?.lng
}

/** Coordinates are stored with 6 decimals (about 10 cm), same as the zod schema. */
function roundPoint(point: { lat: number; lng: number }): LatLng {
  return { lat: Math.round(point.lat * 1e6) / 1e6, lng: Math.round(point.lng * 1e6) / 1e6 }
}

function pinIcon(leaflet: typeof Leaflet, kind: PinKind): Leaflet.DivIcon {
  // Static markup only (no user input), so building an HTML string is safe here.
  return kind === 'start'
    ? leaflet.divIcon({
        className: 'rr-pin rr-pin--picker',
        html: '<span class="rr-pin__drop"><span class="rr-pin__label">始</span></span>',
        iconSize: [44, 48],
        iconAnchor: [22, 46],
      })
    : leaflet.divIcon({
        className: 'rr-pin rr-pin--end rr-pin--picker',
        html: '<span class="rr-pin__ring">終</span>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })
}

/**
 * Start / end pin picker (architecture 9.2-9.4). Leaflet is loaded inside useEffect (SSR-safe).
 * A map click places the pin chosen in "置くピン". Keyboard alternatives: the lat/lng inputs and
 * "地図の中心に置く" (pan with the arrow keys first). The current location is never used.
 */
export function PinPicker({ start, end, onChange, startError, endError, className }: PinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leafletContext, setLeafletContext] = useState<{ leaflet: typeof Leaflet; map: Leaflet.Map } | null>(
    null,
  )
  const markersRef = useRef<Record<PinKind, Leaflet.Marker | null>>({ start: null, end: null })
  /** The point each marker currently shows, so only a changed pin is moved / panned to. */
  const drawnPointsRef = useRef<Record<PinKind, LatLng | null>>({ start: null, end: null })
  const [placingKind, setPlacingKind] = useState<PinKind>('start')

  const placePin = useEffectEvent((point: { lat: number; lng: number }) => {
    const rounded = roundPoint(point)
    onChange(placingKind === 'start' ? { start: rounded, end } : { start, end: rounded })
  })

  const initialView = useEffectEvent((): { center: [number, number]; zoom: number } => {
    const focus = start ?? end
    return focus ? { center: [focus.lat, focus.lng], zoom: PIN_ZOOM } : { center: JAPAN_CENTER, zoom: JAPAN_DEFAULT_ZOOM }
  })

  // Create the map once. cleanup -> map.remove() so StrictMode does not hit "already initialized".
  useEffect(() => {
    let cancelled = false
    let createdMap: Leaflet.Map | null = null

    void (async () => {
      const leaflet = await import('leaflet')
      const container = containerRef.current
      if (cancelled || !container) return
      const view = initialView()
      const map = leaflet.map(container, {
        center: view.center,
        zoom: view.zoom,
        minZoom: GSI_MIN_ZOOM,
        maxZoom: GSI_MAX_ZOOM,
      })
      leaflet
        .tileLayer(GSI_STD_TILE_URL, {
          attribution: GSI_ATTRIBUTION,
          minZoom: GSI_MIN_ZOOM,
          maxZoom: GSI_MAX_ZOOM,
        })
        .addTo(map)
      map.on('click', (event: Leaflet.LeafletMouseEvent) => placePin(event.latlng))
      createdMap = map
      setLeafletContext({ leaflet, map })
    })()

    return () => {
      cancelled = true
      createdMap?.remove()
      markersRef.current = { start: null, end: null }
      drawnPointsRef.current = { start: null, end: null }
    }
  }, [])

  // Keep the markers in sync with the pins.
  useEffect(() => {
    if (!leafletContext) return
    const { leaflet, map } = leafletContext
    const pins: Record<PinKind, LatLng | null> = { start, end }
    for (const kind of ['start', 'end'] as const) {
      const point = pins[kind]
      const marker = markersRef.current[kind]
      if (!point) {
        if (marker) {
          marker.remove()
          markersRef.current[kind] = null
          drawnPointsRef.current[kind] = null
        }
        continue
      }
      // Out-of-Japan values (often half-typed numbers) leave the map as it is.
      if (!isInJapan(point) || samePoint(drawnPointsRef.current[kind], point)) continue
      if (marker) {
        marker.setLatLng([point.lat, point.lng])
      } else {
        const label = kind === 'start' ? '開始地点' : '終了地点'
        // Display only: not focusable and not clickable, so map clicks pass through to the map.
        markersRef.current[kind] = leaflet
          .marker([point.lat, point.lng], {
            icon: pinIcon(leaflet, kind),
            title: label,
            alt: label,
            keyboard: false,
            interactive: false,
          })
          .addTo(map)
      }
      drawnPointsRef.current[kind] = point
      // A pin typed into the inputs may be outside the current view: bring it into view.
      if (!map.getBounds().contains([point.lat, point.lng])) map.panTo([point.lat, point.lng])
    }
  }, [leafletContext, start, end])

  function placeAtCenter() {
    if (!leafletContext) return
    const center = roundPoint(leafletContext.map.getCenter())
    onChange(placingKind === 'start' ? { start: center, end } : { start, end: center })
  }

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm text-ink-muted">{PIN_NOTE}</p>

      <ChoiceGroup
        name="pin-kind"
        legend="置くピン"
        options={PIN_KIND_OPTIONS}
        value={placingKind}
        onChange={setPlacingKind}
      />

      <div className="relative overflow-hidden rounded-md border border-line">
        <div
          ref={containerRef}
          aria-label="ピンを置く地図（矢印キーで動かせます）"
          role="region"
          className="h-72 w-full md:h-80"
        />
        {/* Shows where "地図の中心に置く" puts the pin. Decorative; clicks go through to the map. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ zIndex: CROSSHAIR_Z_INDEX }}
        >
          <Plus
            aria-hidden="true"
            strokeWidth={2.5}
            className="size-8 text-pin-selected"
            style={{ filter: CROSSHAIR_HALO }}
          />
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={placeAtCenter} disabled={!leafletContext}>
          <Crosshair aria-hidden="true" className="size-4" />
          地図の中心に置く
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ start, end: null })}
          disabled={end === null}
        >
          <X aria-hidden="true" className="size-4" />
          終了ピンを消す
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LatLngInputs
          idPrefix="road-start"
          legend="開始地点"
          required
          value={start}
          onChange={(next) => onChange({ start: next, end })}
          error={startError}
        />
        <LatLngInputs
          idPrefix="road-end"
          legend="終了地点（任意）"
          value={end}
          onChange={(next) => onChange({ start, end: next })}
          error={endError}
        />
      </div>
    </div>
  )
}
