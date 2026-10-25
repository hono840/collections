import { describe, expect, it } from 'vitest'
import { addSpot, countByTab, filterSpots, removeSpot, toggleDone, validateSpotInput } from './spots'
import type { Spot, SpotInput, SpotsData } from './types'

const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'
const DISTANCE_INVALID_MESSAGE = '0以上の数字を入れてください'

function makeSpot(overrides: Partial<Spot> & Pick<Spot, 'id'>): Spot {
  return {
    name: `スポット${overrides.id}`,
    region: '神奈川',
    category: '峠',
    distanceKm: '',
    season: '',
    memo: '',
    done: false,
    ...overrides,
  }
}

function makeData(spots: Spot[], nextId: number): SpotsData {
  return { version: 1, nextId, spots }
}

function makeInput(overrides: Partial<SpotInput> = {}): SpotInput {
  return {
    name: '大観山',
    region: '神奈川',
    category: '絶景ロード',
    distanceKm: '',
    season: '',
    memo: '',
    ...overrides,
  }
}

// Freezing makes any in-place mutation throw (ES modules run in strict mode).
function deepFreeze<Value>(value: Value): Value {
  if (value !== null && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue)
    }
    Object.freeze(value)
  }
  return value
}

function makeSampleData(): SpotsData {
  return makeData(
    [
      makeSpot({ id: 1, name: 'ヤビツ峠', category: '峠' }),
      makeSpot({ id: 2, name: '箱根ターンパイク', category: '絶景ロード', done: true }),
      makeSpot({ id: 3, name: '奥多摩', category: '峠', done: true }),
      makeSpot({ id: 4, name: '銚子ドーバーライン', category: '海沿い' }),
      makeSpot({ id: 5, name: '伊豆スカイライン', category: '絶景ロード' }),
    ],
    6,
  )
}

describe('addSpot', () => {
  it('AC12: prepends the new spot to the top of the list', () => {
    const data = makeSampleData()

    const result = addSpot(data, makeInput({ name: '大観山' }))

    expect(result.spots).toHaveLength(6)
    expect(result.spots[0].name).toBe('大観山')
    expect(result.spots.slice(1)).toEqual(data.spots)
  })

  it('AC12/AC16: gives the new spot id = nextId and increments nextId by 1', () => {
    const data = makeSampleData()

    const result = addSpot(data, makeInput())

    expect(result.spots[0].id).toBe(6)
    expect(result.nextId).toBe(7)
    expect(result.version).toBe(1)
  })

  it('AC12: adds the new spot as not done (行きたい)', () => {
    const result = addSpot(makeSampleData(), makeInput())

    expect(result.spots[0].done).toBe(false)
  })

  it('AC12: stores every input field, keeping the chosen category', () => {
    const result = addSpot(
      makeSampleData(),
      makeInput({
        name: '銚子ドーバーライン2',
        region: '千葉',
        category: '海沿い',
        distanceKm: '60',
        season: '夏の夕方',
        memo: '灯台に寄る',
      }),
    )

    expect(result.spots[0]).toEqual({
      id: 6,
      name: '銚子ドーバーライン2',
      region: '千葉',
      category: '海沿い',
      distanceKm: '60',
      season: '夏の夕方',
      memo: '灯台に寄る',
      done: false,
    })
  })

  it('AC12: trims leading and trailing whitespace of name, region, distance, season and memo', () => {
    const result = addSpot(
      makeSampleData(),
      makeInput({
        name: '  大観山  ',
        region: ' 神奈川 ',
        distanceKm: ' 60 ',
        season: '\t紅葉の季節\n',
        memo: '  早朝に行く  ',
      }),
    )

    expect(result.spots[0]).toMatchObject({
      name: '大観山',
      region: '神奈川',
      distanceKm: '60',
      season: '紅葉の季節',
      memo: '早朝に行く',
    })
  })

  it('AC6/AC12: keeps line breaks inside the memo while trimming its ends', () => {
    const result = addSpot(makeSampleData(), makeInput({ memo: '\n 一行目\n二行目 \n' }))

    expect(result.spots[0].memo).toBe('一行目\n二行目')
  })

  it.each(['', '   ', '　'])("AC12: sets region to '未入力' when the region is %j", (blankRegion) => {
    const result = addSpot(makeSampleData(), makeInput({ region: blankRegion }))

    expect(result.spots[0].region).toBe('未入力')
  })

  it('AC16: keeps increasing ids across several adds', () => {
    const afterFirstAdd = addSpot(makeSampleData(), makeInput({ name: '一つ目' }))
    const afterSecondAdd = addSpot(afterFirstAdd, makeInput({ name: '二つ目' }))

    expect(afterSecondAdd.spots.slice(0, 2).map((spot) => [spot.id, spot.name])).toEqual([
      [7, '二つ目'],
      [6, '一つ目'],
    ])
    expect(afterSecondAdd.nextId).toBe(8)
  })

  it('does not mutate the data or the input (returns a new object)', () => {
    const data = deepFreeze(makeSampleData())
    const input = deepFreeze(makeInput({ name: '  大観山  ', region: '' }))
    const dataSnapshot = structuredClone(data)
    const inputSnapshot = structuredClone(input)

    const result = addSpot(data, input)

    expect(result).not.toBe(data)
    expect(result.spots).not.toBe(data.spots)
    expect(data).toEqual(dataSnapshot)
    expect(input).toEqual(inputSnapshot)
  })
})

describe('toggleDone', () => {
  it('AC7: moves a 行きたい spot to 行った', () => {
    const result = toggleDone(makeSampleData(), 1)

    expect(result.spots.find((spot) => spot.id === 1)?.done).toBe(true)
  })

  it('AC7: moves a 行った spot back to 行きたい', () => {
    const result = toggleDone(makeSampleData(), 2)

    expect(result.spots.find((spot) => spot.id === 2)?.done).toBe(false)
  })

  it('AC7: toggling twice restores the original state', () => {
    const data = makeSampleData()

    const result = toggleDone(toggleDone(data, 4), 4)

    expect(result).toEqual(data)
  })

  it('only changes the targeted spot and keeps order, nextId and version', () => {
    const data = makeSampleData()

    const result = toggleDone(data, 4)

    expect(result.spots.map((spot) => spot.id)).toEqual([1, 2, 3, 4, 5])
    expect(result.spots.filter((spot) => spot.id !== 4)).toEqual(
      data.spots.filter((spot) => spot.id !== 4),
    )
    expect(result.spots[3]).toEqual({ ...data.spots[3], done: true })
    expect(result.nextId).toBe(6)
    expect(result.version).toBe(1)
  })

  it('leaves the spots unchanged for an unknown id', () => {
    const data = makeSampleData()

    const result = toggleDone(data, 999)

    expect(result).toEqual(data)
  })

  it('does not mutate the data (returns a new object)', () => {
    const data = deepFreeze(makeSampleData())
    const dataSnapshot = structuredClone(data)

    const result = toggleDone(data, 1)

    expect(result).not.toBe(data)
    expect(result.spots).not.toBe(data.spots)
    expect(data).toEqual(dataSnapshot)
  })
})

describe('removeSpot', () => {
  it('AC8: removes the spot with that id and keeps the others in order', () => {
    const result = removeSpot(makeSampleData(), 3)

    expect(result.spots.map((spot) => spot.id)).toEqual([1, 2, 4, 5])
  })

  it('AC16: keeps nextId unchanged', () => {
    const result = removeSpot(makeSampleData(), 5)

    expect(result.nextId).toBe(6)
    expect(result.version).toBe(1)
  })

  it('AC16: a spot added after deleting the newest spot does not reuse the deleted id', () => {
    const data = makeSampleData()

    const afterRemove = removeSpot(data, 5)
    const afterAdd = addSpot(afterRemove, makeInput({ name: '新しいスポット' }))

    expect(afterAdd.spots[0].id).toBe(6)
    expect(afterAdd.spots.map((spot) => spot.id)).not.toContain(5)
    expect(afterAdd.nextId).toBe(7)
  })

  it('AC13: can remove every spot (an empty list is valid data)', () => {
    let data = makeSampleData()
    for (const spot of makeSampleData().spots) {
      data = removeSpot(data, spot.id)
    }

    expect(data).toEqual({ version: 1, nextId: 6, spots: [] })
  })

  it('leaves the spots unchanged for an unknown id', () => {
    const data = makeSampleData()

    const result = removeSpot(data, 999)

    expect(result).toEqual(data)
  })

  it('does not mutate the data (returns a new object)', () => {
    const data = deepFreeze(makeSampleData())
    const dataSnapshot = structuredClone(data)

    const result = removeSpot(data, 1)

    expect(result).not.toBe(data)
    expect(result.spots).not.toBe(data.spots)
    expect(data).toEqual(dataSnapshot)
  })
})

describe('filterSpots', () => {
  it('AC2: 行きたい tab returns only spots that are not done, in list order', () => {
    const result = filterSpots(makeSampleData().spots, 'want', 'すべて')

    expect(result.map((spot) => spot.id)).toEqual([1, 4, 5])
  })

  it('AC2: 行った tab returns only done spots, in list order', () => {
    const result = filterSpots(makeSampleData().spots, 'done', 'すべて')

    expect(result.map((spot) => spot.id)).toEqual([2, 3])
  })

  it("AC3: 'すべて' does not filter by category", () => {
    const spots = makeSampleData().spots

    const wantCount = filterSpots(spots, 'want', 'すべて').length
    const doneCount = filterSpots(spots, 'done', 'すべて').length

    expect(wantCount + doneCount).toBe(spots.length)
  })

  it('AC3: combines tab and category with AND', () => {
    const spots = makeSampleData().spots

    expect(filterSpots(spots, 'want', '峠').map((spot) => spot.id)).toEqual([1])
    expect(filterSpots(spots, 'done', '峠').map((spot) => spot.id)).toEqual([3])
    expect(filterSpots(spots, 'want', '絶景ロード').map((spot) => spot.id)).toEqual([5])
    expect(filterSpots(spots, 'done', '絶景ロード').map((spot) => spot.id)).toEqual([2])
    expect(filterSpots(spots, 'want', '海沿い').map((spot) => spot.id)).toEqual([4])
  })

  it('AC5: returns an empty array when nothing matches', () => {
    const spots = makeSampleData().spots

    expect(filterSpots(spots, 'done', '海沿い')).toEqual([])
    expect(filterSpots(spots, 'want', 'サーキット')).toEqual([])
    expect(filterSpots([], 'want', 'すべて')).toEqual([])
  })

  it('does not mutate the spots array', () => {
    const spots = deepFreeze(makeSampleData().spots)
    const spotsSnapshot = structuredClone(spots)

    filterSpots(spots, 'done', '峠')

    expect(spots).toEqual(spotsSnapshot)
  })
})

describe('countByTab', () => {
  it('AC2: counts 行きたい and 行った over all spots', () => {
    expect(countByTab(makeSampleData().spots)).toEqual({ want: 3, done: 2 })
  })

  it('AC2: returns zero counts for an empty list', () => {
    expect(countByTab([])).toEqual({ want: 0, done: 0 })
  })
})

describe('validateSpotInput', () => {
  it('returns no errors for a valid input', () => {
    expect(validateSpotInput(makeInput({ name: '大観山', distanceKm: '60' }))).toEqual({})
  })

  it.each(['', ' ', '   ', '\t\n', '　'])(
    `AC10: returns '${NAME_REQUIRED_MESSAGE}' when the name is %j`,
    (blankName) => {
      const errors = validateSpotInput(makeInput({ name: blankName }))

      expect(errors.name).toBe(NAME_REQUIRED_MESSAGE)
    },
  )

  it('AC10: accepts a name that has surrounding whitespace', () => {
    expect(validateSpotInput(makeInput({ name: '  大観山  ' })).name).toBeUndefined()
  })

  // AC11: empty, or a plain half-width decimal /^\d+(\.\d+)?$/ after trimming the ends.
  it.each(['', '   ', '0', '60', '12.5', ' 60 ', '\t12.5\n', '0.0'])(
    'AC11: accepts the distance %j',
    (validDistance) => {
      const errors = validateSpotInput(makeInput({ distanceKm: validDistance }))

      expect(errors.distanceKm).toBeUndefined()
    },
  )

  it.each(['-1', '-0.5', 'abc', '12km', 'Infinity', 'NaN'])(
    `AC11: returns '${DISTANCE_INVALID_MESSAGE}' for the distance %j`,
    (invalidDistance) => {
      const errors = validateSpotInput(makeInput({ distanceKm: invalidDistance }))

      expect(errors.distanceKm).toBe(DISTANCE_INVALID_MESSAGE)
    },
  )

  it.each([
    ['exponent notation', '1e3'],
    ['hexadecimal', '0x10'],
    ['a leading dot', '.5'],
    ['a trailing dot', '12.'],
    ['negative zero', '-0'],
    ['a plus sign', '+5'],
    ['full-width digits', '５０'],
    ['a full-width decimal point', '１２．５'],
    ['a thousands separator', '1,000'],
    ['two decimal points', '1.2.3'],
    ['a space inside the number', '6 0'],
  ])(
    `AC11: returns '${DISTANCE_INVALID_MESSAGE}' for %s (%j), which is not a plain decimal`,
    (_description, invalidDistance) => {
      const errors = validateSpotInput(makeInput({ distanceKm: invalidDistance }))

      expect(errors.distanceKm).toBe(DISTANCE_INVALID_MESSAGE)
    },
  )

  it('AC10/AC11: reports both errors at once', () => {
    expect(validateSpotInput(makeInput({ name: ' ', distanceKm: '-1' }))).toEqual({
      name: NAME_REQUIRED_MESSAGE,
      distanceKm: DISTANCE_INVALID_MESSAGE,
    })
  })

  it('does not mutate the input', () => {
    const input = deepFreeze(makeInput({ name: '  大観山  ', distanceKm: '-1' }))
    const inputSnapshot = structuredClone(input)

    validateSpotInput(input)

    expect(input).toEqual(inputSnapshot)
  })
})
