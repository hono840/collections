import type { ROAD_TYPES } from '@/lib/validation/road'

/** Storage value of roads.road_type (text + check constraint in 00003_roads.sql). */
export type RoadType = (typeof ROAD_TYPES)[number]

export type LatLng = { lat: number; lng: number }

/** A road as shown on the detail and edit pages. */
export type Road = {
  id: string
  name: string
  prefectureCode: number
  roadType: RoadType
  start: LatLng
  end: LatLng | null
  createdAt: string
  updatedAt: string
}

/**
 * A row of the road list / map.
 * Sprint 2 reads the roads table directly, so the drive fields are always empty
 * (null / null / 0); Sprint 3 switches to the road_summaries view.
 */
export type RoadSummary = {
  id: string
  name: string
  prefectureCode: number
  roadType: RoadType
  start: LatLng
  end: LatLng | null
  createdAt: string
  lastDrivenOn: string | null
  lastRatingOverall: number | null
  driveCount: number
}
