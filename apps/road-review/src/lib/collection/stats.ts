import { ROAD_TYPES } from '@/lib/validation/road'
import type { RoadType } from '@/types/road'

// "走った道のコレクション" numbers (PRD US-11). Pure.

export const TOTAL_PREFECTURES = 47

export type CollectionStats = {
  /** Roads with at least one drive (registered-only roads do not count). */
  drivenRoadCount: number
  /** Driven roads per type; all 5 keys in ROAD_TYPES order, 0 included. */
  byRoadType: Record<RoadType, number>
  /** Distinct prefectures of driven roads. */
  drivenPrefectureCount: number
  /** Prefecture code -> driven road count (only codes with at least one). */
  drivenRoadsByPrefecture: Record<number, number>
}

type CollectionRoad = { prefectureCode: number; roadType: RoadType; driveCount: number }

export function buildCollectionStats(roads: ReadonlyArray<CollectionRoad>): CollectionStats {
  const byRoadType = Object.fromEntries(ROAD_TYPES.map((roadType) => [roadType, 0])) as Record<RoadType, number>
  const drivenRoadsByPrefecture: Record<number, number> = {}
  let drivenRoadCount = 0

  for (const road of roads) {
    if (road.driveCount < 1) continue
    drivenRoadCount += 1
    if (road.roadType in byRoadType) byRoadType[road.roadType] += 1
    drivenRoadsByPrefecture[road.prefectureCode] = (drivenRoadsByPrefecture[road.prefectureCode] ?? 0) + 1
  }

  return {
    drivenRoadCount,
    byRoadType,
    drivenPrefectureCount: Object.keys(drivenRoadsByPrefecture).length,
    drivenRoadsByPrefecture,
  }
}
