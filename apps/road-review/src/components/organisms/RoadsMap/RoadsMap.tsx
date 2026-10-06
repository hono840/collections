'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type * as Leaflet from 'leaflet'
import {
  GSI_ATTRIBUTION,
  GSI_MAX_ZOOM,
  GSI_MIN_ZOOM,
  GSI_STD_TILE_URL,
  JAPAN_CENTER,
  JAPAN_DEFAULT_ZOOM,
} from '@/lib/map/gsi-tiles'
import type { RoadSummary } from '@/types/road'
import { cn } from '@/lib/utils/cn'

export type RoadsMapProps = {
  roads: RoadSummary[]
  className?: string
}

const MAP_LABEL = '道の地図（同じ内容は下のリストにあります）'

/** Start pin in the road type color (spec 4-8). Static markup only; the road name never goes into HTML. */
function roadPinIcon(leaflet: typeof Leaflet, road: RoadSummary): Leaflet.DivIcon {
  return leaflet.divIcon({
    className: `rr-pin rr-pin--${road.roadType}`,
    html: '<span class="rr-pin__drop"><span class="rr-pin__label">始</span></span>',
    iconSize: [44, 48],
    iconAnchor: [22, 46],
    popupAnchor: [0, -40],
  })
}

/** Popup built with DOM APIs: the road name is set as text, so it can never inject HTML. */
function roadPopupContent(road: RoadSummary): HTMLElement {
  const container = document.createElement('div')
  container.className = 'space-y-1'
  const name = document.createElement('p')
  name.className = 'heading-mincho text-base text-ink'
  name.textContent = road.name
  const link = document.createElement('a')
  link.href = `/roads/${road.id}`
  link.className = 'inline-flex min-h-11 items-center font-bold text-primary underline'
  link.textContent = '詳細を見る'
  container.append(name, link)
  return container
}

/**
 * All roads on one map (architecture 9.5, US-06). Display only; the list shows the same roads.
 * Leaflet is loaded inside useEffect (SSR-safe). Never asks for the current location.
 */
export function RoadsMap({ roads, className }: RoadsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leafletContext, setLeafletContext] = useState<{ leaflet: typeof Leaflet; map: Leaflet.Map } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    let createdMap: Leaflet.Map | null = null

    void (async () => {
      const leaflet = await import('leaflet')
      const container = containerRef.current
      if (cancelled || !container) return
      const map = leaflet.map(container, { minZoom: GSI_MIN_ZOOM, maxZoom: GSI_MAX_ZOOM })
      leaflet
        .tileLayer(GSI_STD_TILE_URL, {
          attribution: GSI_ATTRIBUTION,
          minZoom: GSI_MIN_ZOOM,
          maxZoom: GSI_MAX_ZOOM,
        })
        .addTo(map)
      createdMap = map
      setLeafletContext({ leaflet, map })
    })()

    return () => {
      cancelled = true
      createdMap?.remove()
    }
  }, [])

  useEffect(() => {
    if (!leafletContext) return
    const { leaflet, map } = leafletContext

    const markers = roads.map((road) =>
      leaflet
        .marker([road.start.lat, road.start.lng], {
          icon: roadPinIcon(leaflet, road),
          title: road.name,
          alt: road.name,
          keyboard: true,
        })
        .bindPopup(roadPopupContent(road))
        .addTo(map),
    )

    if (roads.length === 0) {
      map.setView(JAPAN_CENTER, JAPAN_DEFAULT_ZOOM)
    } else {
      const bounds = leaflet.latLngBounds(roads.map((road): [number, number] => [road.start.lat, road.start.lng]))
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }

    return () => {
      for (const marker of markers) marker.remove()
    }
  }, [leafletContext, roads])

  return (
    <div
      role="region"
      aria-label={MAP_LABEL}
      className={cn('overflow-hidden rounded-md border border-line', className)}
    >
      <div ref={containerRef} className="h-80 w-full md:h-[min(70dvh,40rem)]" />
    </div>
  )
}
