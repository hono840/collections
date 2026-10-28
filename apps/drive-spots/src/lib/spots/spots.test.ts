import { describe, expect, it } from 'vitest'
import { MAX_NEXT_ID } from './storage'
import {
  addSpot,
  countByTab,
  filterSpots,
  removeSpot,
  spotToInput,
  toggleDone,
  updateMemo,
  updateSpot,
  validateSpotInput,
} from './spots'
import type { Spot, SpotInput, SpotsData } from './types'

const NAME_REQUIRED_MESSAGE = 'スポット名を入れてください'
const DISTANCE_INVALID_MESSAGE = '0以上の数字を入れてください'

function makeSpot(overrides: Partial<Spot> & Pick<Spot, 'id'>): Spot {
  return {
    name: `スポット${overrides.id}`,
    region: '神奈川',
    category: '峠',
    distanceKm: '',
    exitInterchange: '',
    season: '',
    memo: '',
    done: false,
    ...overrides,
  }
}

function makeData(spots: Spot[], nextId: number): SpotsData {
  return { version: 2, nextId, spots }
}

function makeInput(overrides: Partial<SpotInput> = {}): SpotInput {
  return {
    name: '大観山',
    region: '神奈川',
    category: '絶景ロード',
    distanceKm: '',
    exitInterchange: '',
    season: '',
    memo: '',
    ...overrides,
  }
}

/** The 9 fields a saved spot has, no more and no fewer (AC12, AC43, AC46). */
const SPOT_KEYS: (keyof Spot)[] = ['id', 'name', 'region', 'category', 'distanceKm', 'exitInterchange', 'season', 'memo', 'done']

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
    expect(result.version).toBe(2)
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
        exitInterchange: '銚子IC',
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
      exitInterchange: '銚子IC',
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

  it.each([
    ['half-width spaces', '  小田原西IC  '],
    ['full-width spaces', '　小田原西IC　'],
    ['tabs and line breaks', '\t小田原西IC\n'],
  ])('AC47: trims %s around 降りるIC (%j)', (_description, rawExitInterchange) => {
    const result = addSpot(makeSampleData(), makeInput({ exitInterchange: rawExitInterchange }))

    expect(result.spots[0].exitInterchange).toBe('小田原西IC')
  })

  it('AC47: keeps a space inside 降りるIC', () => {
    const result = addSpot(makeSampleData(), makeInput({ exitInterchange: ' 東名高速 大井松田IC ' }))

    expect(result.spots[0].exitInterchange).toBe('東名高速 大井松田IC')
  })

  it.each(['', '   ', '　', '\t\n'])('AC47: a blank 降りるIC %j is saved as empty (not entered, no error)', (blankExitInterchange) => {
    const result = addSpot(makeSampleData(), makeInput({ exitInterchange: blankExitInterchange }))

    expect(result.spots[0].exitInterchange).toBe('')
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

  it('AC12/AC16: an input that also carries id, done and an extra key cannot set them (security)', () => {
    // id 1 is already used, so taking it from the input would give two spots the same id (AC16).
    const hostileInput = { ...makeInput({ name: '大観山' }), id: 1, done: true, isAdmin: true } as unknown as SpotInput

    const result = addSpot(makeSampleData(), hostileInput)

    const addedSpot = result.spots[0]
    expect(addedSpot).toEqual({ id: 6, ...makeInput({ name: '大観山' }), done: false })
    expect(Object.keys(addedSpot).sort()).toEqual([...SPOT_KEYS].sort())
    expect(Object.getPrototypeOf(addedSpot)).toBe(Object.prototype)
    expect(result.nextId).toBe(7)
    expect(result.spots.map((spot) => spot.id)).toEqual([6, 1, 2, 3, 4, 5])
  })

  describe('at the nextId cap (AC16, MAX_NEXT_ID = 1,000,000,000)', () => {
    /** The largest data AC16 allows: nextId exactly at the cap, the newest spot right below it. */
    function makeCappedData(nextId: number): SpotsData {
      return makeData([makeSpot({ id: nextId - 1, name: '細工したファイルのスポット' }), makeSpot({ id: 1 })], nextId)
    }

    it('AC16: with nextId exactly at the cap, adds nothing and returns the same content', () => {
      const data = makeCappedData(1_000_000_000)

      const result = addSpot(data, makeInput({ name: '大観山' }))

      expect(result).toEqual(data)
      expect(result.nextId).toBe(1_000_000_000)
      expect(result.spots.map((spot) => spot.name)).not.toContain('大観山')
    })

    it('AC16: with nextId above the cap, adds nothing either', () => {
      const data = makeCappedData(1_000_000_001)

      expect(addSpot(data, makeInput())).toEqual(data)
    })

    it('AC16: at the cap it still does not mutate the data (returns a new object)', () => {
      const data = deepFreeze(makeCappedData(1_000_000_000))
      const dataSnapshot = structuredClone(data)

      const result = addSpot(data, makeInput())

      expect(result).not.toBe(data)
      expect(result.spots).not.toBe(data.spots)
      expect(data).toEqual(dataSnapshot)
    })

    it('AC16: with nextId just below the cap, adds normally and reaches the cap exactly', () => {
      const data = makeCappedData(999_999_999)

      const result = addSpot(data, makeInput({ name: '大観山' }))

      expect(result.spots).toHaveLength(3)
      expect(result.spots[0]).toMatchObject({ id: 999_999_999, name: '大観山' })
      expect(result.nextId).toBe(1_000_000_000)
    })

    it('AC16: the add after reaching the cap is the one that adds nothing', () => {
      const atCap = addSpot(makeCappedData(999_999_999), makeInput({ name: '一つ目' }))

      const afterCap = addSpot(atCap, makeInput({ name: '二つ目' }))

      expect(afterCap).toEqual(atCap)
      expect(afterCap.spots.map((spot) => spot.name)).not.toContain('二つ目')
    })
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
    expect(result.version).toBe(2)
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
    expect(result.version).toBe(2)
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

    expect(data).toEqual({ version: 2, nextId: 6, spots: [] })
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

describe('updateMemo', () => {
  // Non-sequential ids, every field filled and a 行った spot, so "only the memo changes" (AC26) means something.
  function makeFilledData(): SpotsData {
    return makeData(
      [
        makeSpot({
          id: 7,
          name: '奥多摩',
          region: '東京',
          category: '峠',
          distanceKm: '45',
          exitInterchange: '八王子IC',
          season: '新緑の頃',
          memo: '古いメモ',
          done: true,
        }),
        makeSpot({ id: 3, name: '箱根ターンパイク', category: '絶景ロード', memo: '' }),
        makeSpot({
          id: 12,
          name: '銚子ドーバーライン',
          region: '千葉',
          category: '海沿い',
          distanceKm: '120',
          season: '夏の夕方',
          memo: '灯台に寄る',
        }),
      ],
      30,
    )
  }

  function findMemo(data: SpotsData, id: number): string | undefined {
    return data.spots.find((spot) => spot.id === id)?.memo
  }

  it('AC24: replaces the memo of the spot with that id', () => {
    const result = updateMemo(makeFilledData(), 7, '朝のうちに走る')

    expect(findMemo(result, 7)).toBe('朝のうちに走る')
  })

  it('AC24: fills in a memo that was empty', () => {
    const result = updateMemo(makeFilledData(), 3, '新しいメモ')

    expect(findMemo(result, 3)).toBe('新しいメモ')
  })

  it.each([
    ['half-width spaces', '  早朝に行く  '],
    ['full-width spaces', '　早朝に行く　'],
    ['tabs and line breaks', '\t\n早朝に行く\n\t'],
    ['a mix of half-width spaces, full-width spaces and line breaks', ' 　\n早朝に行く \n　'],
  ])('AC24: trims %s around the memo (%j), like adding does', (_description, rawMemo) => {
    const result = updateMemo(makeFilledData(), 7, rawMemo)

    expect(findMemo(result, 7)).toBe('早朝に行く')
  })

  it('AC24: keeps line breaks and spaces inside the memo while trimming its ends', () => {
    const result = updateMemo(makeFilledData(), 7, '\n 一行目\n\n二行目 　三行目 \n')

    expect(findMemo(result, 7)).toBe('一行目\n\n二行目 　三行目')
  })

  it.each(['', '   ', '　', '\n\t　 '])('AC24: the blank memo %j empties the memo', (blankMemo) => {
    const result = updateMemo(makeFilledData(), 7, blankMemo)

    expect(findMemo(result, 7)).toBe('')
  })

  it('AC26: changes nothing but the memo (other fields, other spots, order, nextId, version)', () => {
    const data = makeFilledData()

    const result = updateMemo(data, 7, '  新しいメモ  ')

    expect(result).toEqual({
      version: 2,
      nextId: 30,
      spots: [{ ...data.spots[0], memo: '新しいメモ' }, data.spots[1], data.spots[2]],
    })
    expect(result.spots.map((spot) => spot.id)).toEqual([7, 3, 12])
    expect(result.spots[0]).toMatchObject({
      id: 7,
      name: '奥多摩',
      region: '東京',
      category: '峠',
      distanceKm: '45',
      exitInterchange: '八王子IC',
      season: '新緑の頃',
      done: true,
    })
  })

  it('AC26: changing the memo of a 行きたい spot keeps it 行きたい and in place', () => {
    const data = makeFilledData()

    const result = updateMemo(data, 12, '新しいメモ')

    expect(result.spots[2]).toEqual({ ...data.spots[2], memo: '新しいメモ' })
    expect(result.spots.slice(0, 2)).toEqual(data.spots.slice(0, 2))
  })

  it('AC27: leaves the content unchanged for an unknown id (no spot is created)', () => {
    const data = makeFilledData()

    const result = updateMemo(data, 999, '新しいメモ')

    expect(result).toEqual(data)
    expect(result.spots).toHaveLength(3)
    expect(result.spots.map((spot) => spot.memo)).not.toContain('新しいメモ')
  })

  it('AC27: does not bring back a spot that has been removed', () => {
    const afterRemove = removeSpot(makeFilledData(), 7)

    const result = updateMemo(afterRemove, 7, '新しいメモ')

    expect(result).toEqual(afterRemove)
    expect(result.spots.map((spot) => spot.id)).toEqual([3, 12])
    expect(result.nextId).toBe(30)
  })

  it('does not mutate the data (returns a new object)', () => {
    const data = deepFreeze(makeFilledData())
    const dataSnapshot = structuredClone(data)

    const result = updateMemo(data, 7, '  新しいメモ  ')

    expect(result).not.toBe(data)
    expect(result.spots).not.toBe(data.spots)
    expect(data).toEqual(dataSnapshot)
  })
})

describe('spotToInput (AC42)', () => {
  const FILLED_SPOT: Spot = makeSpot({
    id: 30,
    name: '大観山',
    region: '神奈川',
    category: '絶景ロード',
    distanceKm: '60',
    exitInterchange: '小田原西IC',
    season: '紅葉の季節',
    memo: '一行目\n二行目',
    done: true,
  })

  it('AC42: returns the 7 fields the form edits, exactly as saved', () => {
    expect(spotToInput(FILLED_SPOT)).toEqual({
      name: '大観山',
      region: '神奈川',
      category: '絶景ロード',
      distanceKm: '60',
      exitInterchange: '小田原西IC',
      season: '紅葉の季節',
      memo: '一行目\n二行目',
    } satisfies SpotInput)
  })

  it('AC42: leaves out id and done (they are not edited)', () => {
    expect(Object.keys(spotToInput(FILLED_SPOT)).sort()).toEqual(
      ['category', 'distanceKm', 'exitInterchange', 'memo', 'name', 'region', 'season'].sort(),
    )
  })

  it("AC42: a region of exactly '未入力' becomes an empty field", () => {
    expect(spotToInput({ ...FILLED_SPOT, region: '未入力' }).region).toBe('')
  })

  it.each([
    ['a region that only starts with 未入力', '未入力の峠'],
    ['a region that only ends with 未入力', '県名未入力'],
    ['未入力 with a trailing space', '未入力 '],
    ['未入力 with a leading full-width space', '　未入力'],
    ['an ordinary region', '静岡・神奈川'],
  ])("AC42: %s (%j) is not exactly '未入力' and is kept as it is", (_description, region) => {
    expect(spotToInput({ ...FILLED_SPOT, region }).region).toBe(region)
  })

  it("AC42: only the region is mapped: a name, season or memo of '未入力' stays", () => {
    const input = spotToInput({ ...FILLED_SPOT, name: '未入力', season: '未入力', memo: '未入力', exitInterchange: '未入力' })

    expect(input).toMatchObject({ name: '未入力', season: '未入力', memo: '未入力', exitInterchange: '未入力' })
  })

  it('AC42: empty fields stay empty (distance, 降りるIC, season, memo)', () => {
    const input = spotToInput(makeSpot({ id: 1, name: 'ヤビツ峠' }))

    expect(input).toEqual({
      name: 'ヤビツ峠',
      region: '神奈川',
      category: '峠',
      distanceKm: '',
      exitInterchange: '',
      season: '',
      memo: '',
    } satisfies SpotInput)
  })

  it('AC42: copies the other fields as they are (no trimming here; saving trims)', () => {
    const input = spotToInput({ ...FILLED_SPOT, name: ' 大観山 ', memo: '\n一行目\n' })

    expect(input.name).toBe(' 大観山 ')
    expect(input.memo).toBe('\n一行目\n')
  })

  it('does not mutate the spot (returns a new object)', () => {
    const spot = deepFreeze(structuredClone({ ...FILLED_SPOT, region: '未入力' }))
    const spotSnapshot = structuredClone(spot)

    const input = spotToInput(spot)

    expect(input).not.toBe(spot)
    expect(spot).toEqual(spotSnapshot)
  })
})

describe('updateSpot (AC43, AC45)', () => {
  // Non-sequential ids, a 行った spot in the middle and every field filled, so "only the 7 fields
  // change" means something.
  function makeEditData(): SpotsData {
    return makeData(
      [
        makeSpot({ id: 12, name: '銚子ドーバーライン', region: '千葉', category: '海沿い', memo: '灯台に寄る' }),
        makeSpot({
          id: 7,
          name: '奥多摩',
          region: '東京',
          category: '峠',
          distanceKm: '45',
          exitInterchange: '八王子IC',
          season: '新緑の頃',
          memo: '古いメモ',
          done: true,
        }),
        makeSpot({ id: 3, name: '箱根ターンパイク', category: '絶景ロード' }),
      ],
      30,
    )
  }

  const EDITED_INPUT: SpotInput = {
    name: '奥多摩周遊道路',
    region: '東京・山梨',
    category: '絶景ロード',
    distanceKm: '70',
    exitInterchange: 'あきる野IC',
    season: '紅葉の季節',
    memo: '一行目\n二行目',
  }

  function findSpot(data: SpotsData, id: number): Spot | undefined {
    return data.spots.find((spot) => spot.id === id)
  }

  it('AC43: changes the name, category, region, distance, 降りるIC, season and memo of that spot', () => {
    const result = updateSpot(makeEditData(), 7, EDITED_INPUT)

    expect(findSpot(result, 7)).toEqual({ id: 7, ...EDITED_INPUT, done: true })
  })

  it('AC43: keeps done, the id, the order, nextId and version', () => {
    const data = makeEditData()

    const result = updateSpot(data, 7, EDITED_INPUT)

    expect(result.version).toBe(2)
    expect(result.nextId).toBe(30)
    expect(result.spots.map((spot) => spot.id)).toEqual([12, 7, 3])
    expect(findSpot(result, 7)?.done).toBe(true)
  })

  it('AC43: a 行きたい spot stays 行きたい', () => {
    const result = updateSpot(makeEditData(), 12, EDITED_INPUT)

    expect(findSpot(result, 12)).toEqual({ id: 12, ...EDITED_INPUT, done: false })
  })

  it('AC43: leaves every other spot as it was', () => {
    const data = makeEditData()

    const result = updateSpot(data, 7, EDITED_INPUT)

    expect(result.spots[0]).toEqual(data.spots[0])
    expect(result.spots[2]).toEqual(data.spots[2])
  })

  it.each([
    ['half-width spaces', (text: string) => `  ${text}  `],
    ['full-width spaces', (text: string) => `　${text}　`],
    ['tabs and line breaks', (text: string) => `\t\n${text}\n\t`],
  ])('AC43: trims %s around every text field, like adding does (AC12)', (_description, surround) => {
    const result = updateSpot(makeEditData(), 7, {
      name: surround('奥多摩周遊道路'),
      region: surround('東京・山梨'),
      category: '絶景ロード',
      distanceKm: surround('70'),
      exitInterchange: surround('あきる野IC'),
      season: surround('紅葉の季節'),
      memo: surround('早朝に行く'),
    })

    expect(findSpot(result, 7)).toEqual({
      id: 7,
      name: '奥多摩周遊道路',
      region: '東京・山梨',
      category: '絶景ロード',
      distanceKm: '70',
      exitInterchange: 'あきる野IC',
      season: '紅葉の季節',
      memo: '早朝に行く',
      done: true,
    })
  })

  it.each(['', '   ', '　', '\t\n'])("AC43: a blank region %j becomes '未入力', like adding does (AC12)", (blankRegion) => {
    const result = updateSpot(makeEditData(), 7, { ...EDITED_INPUT, region: blankRegion })

    expect(findSpot(result, 7)?.region).toBe('未入力')
  })

  it('AC43/AC24: keeps line breaks and spaces inside the memo while trimming its ends', () => {
    const result = updateSpot(makeEditData(), 7, { ...EDITED_INPUT, memo: '\n 一行目\n\n二行目 　三行目 \n' })

    expect(findSpot(result, 7)?.memo).toBe('一行目\n\n二行目 　三行目')
  })

  it('AC43/AC47: blank distance, 降りるIC, season and memo empty those fields', () => {
    const result = updateSpot(makeEditData(), 7, {
      ...EDITED_INPUT,
      distanceKm: ' ',
      exitInterchange: '　',
      season: '\t',
      memo: '\n',
    })

    expect(findSpot(result, 7)).toMatchObject({ distanceKm: '', exitInterchange: '', season: '', memo: '' })
  })

  it('AC43: trims exactly like addSpot (the same input gives the same 7 fields)', () => {
    const rawInput: SpotInput = {
      name: ' 　奥多摩周遊道路\t',
      region: '　',
      category: 'サーキット',
      distanceKm: ' 12.5 ',
      exitInterchange: '\nあきる野IC　',
      season: '  紅葉の季節',
      memo: '\n 一行目\n二行目 \n',
    }
    const added = addSpot(makeEditData(), rawInput).spots[0]

    const updated = findSpot(updateSpot(makeEditData(), 7, rawInput), 7)

    expect(updated).toEqual({ ...added, id: 7, done: true })
  })

  it('AC42/AC43: saving spotToInput unchanged gives the same data (a region of 未入力 stays 未入力)', () => {
    const data = makeData([makeSpot({ id: 5, name: '大観山', region: '未入力', exitInterchange: '小田原西IC' })], 9)

    const result = updateSpot(data, 5, spotToInput(data.spots[0]))

    expect(result).toEqual(data)
  })

  it('AC43: id and done never come from the input, even when a whole Spot is passed as the input', () => {
    const otherSpot = makeSpot({ id: 99, name: '別のスポット', done: false })

    const result = updateSpot(makeEditData(), 7, otherSpot)

    expect(result.spots.map((spot) => spot.id)).toEqual([12, 7, 3])
    expect(findSpot(result, 7)).toMatchObject({ id: 7, name: '別のスポット', done: true })
    expect(Object.keys(findSpot(result, 7) ?? {}).sort()).toEqual(
      ['category', 'distanceKm', 'done', 'exitInterchange', 'id', 'memo', 'name', 'region', 'season'].sort(),
    )
  })

  it.each<[string, number, boolean, boolean]>([
    ['a 行った spot, the input saying done false', 7, false, true],
    ['a 行きたい spot, the input saying done true', 12, true, false],
  ])(
    'AC43: an input that also carries id, done and an extra key cannot set them (security; %s)',
    (_description, editedId, inputDone, expectedDone) => {
      // id 3 belongs to another spot, so taking it from the input would give two spots the same id (AC16).
      const hostileInput = { ...EDITED_INPUT, id: 3, done: inputDone, isAdmin: true } as unknown as SpotInput
      const data = makeEditData()

      const result = updateSpot(data, editedId, hostileInput)

      const editedSpot = findSpot(result, editedId)
      expect(editedSpot).toEqual({ id: editedId, ...EDITED_INPUT, done: expectedDone })
      expect(Object.keys(editedSpot ?? {}).sort()).toEqual([...SPOT_KEYS].sort())
      expect(Object.getPrototypeOf(editedSpot)).toBe(Object.prototype)
      expect(result.spots.map((spot) => spot.id)).toEqual([12, 7, 3])
      expect(findSpot(result, 3)).toEqual(findSpot(data, 3))
      expect(result.nextId).toBe(30)
    },
  )

  it('AC45/AC27: leaves the content unchanged for an unknown id (no spot is created) and returns a new object', () => {
    const data = makeEditData()

    const result = updateSpot(data, 999, EDITED_INPUT)

    expect(result).toEqual(data)
    expect(result).not.toBe(data)
    expect(result.spots.map((spot) => spot.name)).not.toContain(EDITED_INPUT.name)
  })

  it('AC45/AC27: does not bring back a spot that has been removed', () => {
    const afterRemove = removeSpot(makeEditData(), 7)

    const result = updateSpot(afterRemove, 7, EDITED_INPUT)

    expect(result).toEqual(afterRemove)
    expect(result.spots.map((spot) => spot.id)).toEqual([12, 3])
    expect(result.nextId).toBe(30)
  })

  it('AC16/AC43: still edits when nextId is at the cap (editing adds nothing, so the cap does not apply)', () => {
    const data = makeData([makeSpot({ id: MAX_NEXT_ID - 1, name: '細工したファイルのスポット' })], MAX_NEXT_ID)

    const result = updateSpot(data, MAX_NEXT_ID - 1, EDITED_INPUT)

    expect(result.nextId).toBe(MAX_NEXT_ID)
    expect(result.spots).toEqual([{ id: MAX_NEXT_ID - 1, ...EDITED_INPUT, done: false }])
  })

  it('does not mutate the data or the input (returns a new object)', () => {
    const data = deepFreeze(makeEditData())
    const input = deepFreeze({ ...EDITED_INPUT, name: '  奥多摩周遊道路  ', region: '' })
    const dataSnapshot = structuredClone(data)
    const inputSnapshot = structuredClone(input)

    const result = updateSpot(data, 7, input)

    expect(result).not.toBe(data)
    expect(result.spots).not.toBe(data.spots)
    expect(data).toEqual(dataSnapshot)
    expect(input).toEqual(inputSnapshot)
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
