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
 * A row of the road list / map (road_summaries view, 00004_drives_road_info.sql).
 * lastDrivenOn / lastRatingOverall come from the newest drive (driven_on desc, created_at desc);
 * averageOverall is roundedAverage(rating_overall_sum, drive_count) (PRD US-07 "総合 平均 X.X").
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
  /**
   * null when the road has no drives. listRoadSummaries always sets it; it is optional only so
   * fixtures written before Sprint 3 stay valid (treat undefined as null).
   */
  averageOverall?: number | null
}
