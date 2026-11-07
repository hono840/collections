import { describe, expect, it } from 'vitest'
import { buildCollectionStats, TOTAL_PREFECTURES } from './stats'

// "走った道のコレクション" numbers (PRD US-11). Pure.
// Contract (src/lib/collection/stats.ts):
//   TOTAL_PREFECTURES = 47
//   type CollectionStats = {
//     drivenRoadCount: number                                   // roads with driveCount >= 1 (registered-only roads do not count)
//     byRoadType: Record<RoadType, number>                      // driven roads per type; all 5 keys, ROAD_TYPES order, 0 included
//     drivenPrefectureCount: number                             // distinct prefectures of driven roads
//     drivenRoadsByPrefecture: Record<number, number>           // prefecture code -> driven road count (only codes > 0)
//   }
//   buildCollectionStats(roads: Array<{ prefectureCode: number; roadType: RoadType; driveCount: number }>): CollectionStats

const road = (prefectureCode: number, roadType: 'pass' | 'skyline' | 'coastal' | 'forest' | 'other', driveCount: number) => ({
  prefectureCode,
  roadType,
  driveCount,
})

describe('buildCollectionStats()', () => {
  it('PRD example: 峠A (2 drives, 長野), 峠B (1 drive, 長野), スカイラインC (0 drives, 静岡)', () => {
    const stats = buildCollectionStats([road(20, 'pass', 2), road(20, 'pass', 1), road(22, 'skyline', 0)])
    expect(stats.drivenRoadCount).toBe(2)
    expect(stats.byRoadType).toEqual({ pass: 2, skyline: 0, coastal: 0, forest: 0, other: 0 })
    expect(stats.drivenPrefectureCount).toBe(1)
    expect(stats.drivenRoadsByPrefecture).toEqual({ 20: 2 })
  })

  it("after deleting 峠B's only drive: 走った道 1本, 峠 1本, 都道府県 1/47", () => {
    const stats = buildCollectionStats([road(20, 'pass', 2), road(20, 'pass', 0), road(22, 'skyline', 0)])
    expect(stats.drivenRoadCount).toBe(1)
    expect(stats.byRoadType.pass).toBe(1)
    expect(stats.drivenPrefectureCount).toBe(1)
  })

  it('after changing 峠A to 林道 in 山梨: 峠 1本・林道 1本, 2/47, 長野 1 and 山梨 1', () => {
    const stats = buildCollectionStats([road(19, 'forest', 2), road(20, 'pass', 1), road(22, 'skyline', 0)])
    expect(stats.byRoadType).toEqual({ pass: 1, skyline: 0, coastal: 0, forest: 1, other: 0 })
    expect(stats.drivenPrefectureCount).toBe(2)
    expect(stats.drivenRoadsByPrefecture).toEqual({ 19: 1, 20: 1 })
  })

  it('byRoadType always lists the 5 types in PRD order, even when 0', () => {
    expect(Object.keys(buildCollectionStats([]).byRoadType)).toEqual(['pass', 'skyline', 'coastal', 'forest', 'other'])
  })

  it('no driven roads -> zeros', () => {
    expect(buildCollectionStats([road(13, 'other', 0)])).toEqual({
      drivenRoadCount: 0,
      byRoadType: { pass: 0, skyline: 0, coastal: 0, forest: 0, other: 0 },
      drivenPrefectureCount: 0,
      drivenRoadsByPrefecture: {},
    })
  })

  it('there are 47 prefectures', () => {
    expect(TOTAL_PREFECTURES).toBe(47)
  })
})
