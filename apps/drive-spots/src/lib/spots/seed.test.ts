import { describe, expect, it } from 'vitest'
import { createSeedData } from './seed'
import { CATEGORIES, SPOTS_DATA_VERSION } from './types'

// The 19 rows of the `seed` array in docs/design/Main.dc.html, in design order.
// Design tuple order is [name, region, category, season, memo]; season is '' for every row.
const DESIGN_SEED_ROWS = [
  { name: 'ヤビツ峠', region: '神奈川', category: '峠', memo: '峠のホームコースにしたい' },
  { name: '箱根ターンパイク', region: '神奈川', category: '絶景ロード', memo: '' },
  { name: '箱根スカイライン', region: '静岡・神奈川', category: '絶景ロード', memo: '' },
  { name: '富士スピードウェイ', region: '静岡', category: 'サーキット', memo: '' },
  { name: '伊豆スカイライン', region: '静岡', category: '絶景ロード', memo: '' },
  { name: '西伊豆スカイライン', region: '静岡', category: '絶景ロード', memo: '' },
  { name: '奥多摩', region: '東京', category: '峠', memo: '' },
  { name: '首都高（都心環状線）', region: '東京', category: '都市高速', memo: '' },
  { name: '赤城山', region: '群馬', category: '峠', memo: '' },
  { name: '榛名山', region: '群馬', category: '峠', memo: '' },
  { name: '碓氷峠', region: '群馬・長野', category: '峠', memo: '' },
  {
    name: '志賀草津高原ルート',
    region: '群馬・長野',
    category: '絶景ロード',
    memo: '冬は通行止めの期間あり。行く前に通れるか確認',
  },
  { name: 'ビーナスライン', region: '長野', category: '絶景ロード', memo: '' },
  { name: 'いろは坂', region: '栃木', category: '峠', memo: '' },
  { name: '中禅寺湖スカイライン', region: '栃木', category: '絶景ロード', memo: '' },
  { name: '筑波パープルライン', region: '茨城', category: '絶景ロード', memo: '' },
  { name: '銚子ドーバーライン', region: '千葉', category: '海沿い', memo: '' },
  { name: '九十九里浜', region: '千葉', category: '海沿い', memo: '' },
  { name: '伊吹山ドライブウェイ', region: '岐阜・滋賀', category: '絶景ロード', memo: '' },
] as const

describe('createSeedData', () => {
  // 初期データ: `version` は 2 (changed from 1 on 2026-10-28, AC46).
  it('AC1/AC46: returns version 2 data with 19 spots and nextId 20', () => {
    const seedData = createSeedData()

    expect(seedData.version).toBe(2)
    expect(seedData.version).toBe(SPOTS_DATA_VERSION)
    expect(seedData.spots).toHaveLength(19)
    expect(seedData.nextId).toBe(20)
  })

  it('AC1: assigns ids 1 to 19 in design order', () => {
    const seedData = createSeedData()

    expect(seedData.spots.map((spot) => spot.id)).toEqual(
      Array.from({ length: 19 }, (_unused, index) => index + 1),
    )
  })

  it('AC1: contains the design rows (name, region, category, memo) in design order', () => {
    const seedData = createSeedData()

    expect(
      seedData.spots.map((spot) => ({
        name: spot.name,
        region: spot.region,
        category: spot.category,
        memo: spot.memo,
      })),
    ).toEqual(DESIGN_SEED_ROWS)
  })

  it('AC1: keeps the two memos from the design and leaves the other memos empty', () => {
    const seedData = createSeedData()

    const spotsWithMemo = seedData.spots.filter((spot) => spot.memo !== '')

    expect(spotsWithMemo.map((spot) => [spot.id, spot.memo])).toEqual([
      [1, '峠のホームコースにしたい'],
      [12, '冬は通行止めの期間あり。行く前に通れるか確認'],
    ])
  })

  it('AC1: leaves distance and season empty for every spot', () => {
    const seedData = createSeedData()

    for (const spot of seedData.spots) {
      expect(spot.distanceKm).toBe('')
      expect(spot.season).toBe('')
    }
  })

  it('AC1/AC46: leaves 降りるIC (exitInterchange) empty for every spot', () => {
    const seedData = createSeedData()

    for (const spot of seedData.spots) {
      expect(spot.exitInterchange).toBe('')
    }
  })

  it('AC1: marks every spot as not done (all start in 行きたい)', () => {
    const seedData = createSeedData()

    expect(seedData.spots.every((spot) => spot.done === false)).toBe(true)
  })

  it('AC1: only uses known categories', () => {
    const seedData = createSeedData()

    for (const spot of seedData.spots) {
      expect(CATEGORIES).toContain(spot.category)
    }
  })

  it('AC1: has exactly the Spot fields (no leftovers from the design such as cat/dist)', () => {
    const seedData = createSeedData()

    for (const spot of seedData.spots) {
      expect(Object.keys(spot).sort()).toEqual(
        ['category', 'distanceKm', 'done', 'exitInterchange', 'id', 'memo', 'name', 'region', 'season'].sort(),
      )
    }
  })

  it('returns a fresh object on every call (mutating one result does not affect the next)', () => {
    const firstSeedData = createSeedData()
    const secondSeedData = createSeedData()

    expect(secondSeedData).not.toBe(firstSeedData)
    expect(secondSeedData.spots).not.toBe(firstSeedData.spots)
    expect(secondSeedData.spots[0]).not.toBe(firstSeedData.spots[0])

    firstSeedData.spots[0].done = true
    firstSeedData.spots[0].name = 'changed'
    firstSeedData.spots.pop()
    firstSeedData.nextId = 999

    const thirdSeedData = createSeedData()
    expect(thirdSeedData.spots).toHaveLength(19)
    expect(thirdSeedData.spots[0]).toMatchObject({ name: 'ヤビツ峠', done: false })
    expect(thirdSeedData.nextId).toBe(20)
  })
})
