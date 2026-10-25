import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSeedData } from './seed'
import { addSpot, toggleDone } from './spots'
import {
  BACKUP_KEY,
  STORAGE_KEY,
  getBrowserStorage,
  loadSpotsData,
  parseSpotsData,
  saveSpotsData,
  updateSpotsData,
} from './storage'
import { CATEGORIES } from './types'
import type { Spot, SpotInput, SpotsData } from './types'

/** Small in-memory Storage so each test starts from an empty, isolated store. */
function createMemoryStorage(initialItems: Record<string, string> = {}): Storage {
  const items = new Map<string, string>(Object.entries(initialItems))
  const storage: Storage = {
    get length() {
      return items.size
    },
    clear() {
      items.clear()
    },
    getItem(key) {
      return items.get(key) ?? null
    },
    key(index) {
      return Array.from(items.keys())[index] ?? null
    },
    removeItem(key) {
      items.delete(key)
    },
    setItem(key, value) {
      items.set(key, String(value))
    },
  }
  return storage
}

function throwSecurityError(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

function throwQuotaExceededError(): never {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

const VALID_SPOT: Spot = {
  id: 22,
  name: '大観山',
  region: '未入力',
  category: '絶景ロード',
  distanceKm: '60',
  season: '紅葉の季節',
  memo: '一行目\n二行目',
  done: false,
}

const VALID_DONE_SPOT: Spot = {
  id: 3,
  name: '箱根スカイライン',
  region: '静岡・神奈川',
  category: '絶景ロード',
  distanceKm: '',
  season: '',
  memo: '',
  done: true,
}

const VALID_DATA: SpotsData = { version: 1, nextId: 23, spots: [VALID_SPOT, VALID_DONE_SPOT] }

function withoutKey<Source extends object>(source: Source, key: keyof Source): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([entryKey]) => entryKey !== key))
}

function withSpot(spot: unknown): Record<string, unknown> {
  return { ...VALID_DATA, spots: [spot] }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('storage keys', () => {
  it("AC13: saves under 'drive-spots:v1'", () => {
    expect(STORAGE_KEY).toBe('drive-spots:v1')
  })

  it("AC14: backs corrupt data up under 'drive-spots:v1:backup'", () => {
    expect(BACKUP_KEY).toBe('drive-spots:v1:backup')
  })
})

describe('getBrowserStorage', () => {
  it('AC13: returns window.localStorage in a browser', () => {
    expect(getBrowserStorage()).toBe(window.localStorage)
  })

  it('AC15: returns null when accessing window.localStorage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(throwSecurityError)

    expect(getBrowserStorage()).toBeNull()
  })
})

describe('parseSpotsData', () => {
  it('AC13: accepts a valid payload and returns the same data', () => {
    expect(parseSpotsData(JSON.stringify(VALID_DATA))).toEqual(VALID_DATA)
  })

  it('AC13: accepts an empty spot list (every spot deleted)', () => {
    const emptyData: SpotsData = { version: 1, nextId: 20, spots: [] }

    expect(parseSpotsData(JSON.stringify(emptyData))).toEqual(emptyData)
  })

  it.each(CATEGORIES)('AC13: accepts a spot with the category %s', (category) => {
    const payload: SpotsData = { ...VALID_DATA, spots: [{ ...VALID_SPOT, category }] }

    expect(parseSpotsData(JSON.stringify(payload))).toEqual(payload)
  })

  it('AC13: accepts the seed data round trip', () => {
    const seedData = createSeedData()

    expect(parseSpotsData(JSON.stringify(seedData))).toEqual(seedData)
  })

  it.each([
    ['an empty string', ''],
    ['text that is not JSON', 'not json'],
    ['broken JSON', '{"version":1,"nextId":20,"spots":['],
    ['JSON null', 'null'],
    ['a JSON number', '42'],
    ['a JSON string', '"drive-spots"'],
    ['a JSON boolean', 'true'],
    ['a JSON array', '[]'],
  ])('AC14: rejects %s', (_description, raw) => {
    expect(parseSpotsData(raw)).toBeNull()
  })

  it.each<[string, unknown]>([
    ['version 2', { ...VALID_DATA, version: 2 }],
    ['version as a string', { ...VALID_DATA, version: '1' }],
    ['a missing version', withoutKey(VALID_DATA, 'version')],
    ['a missing nextId', withoutKey(VALID_DATA, 'nextId')],
    ['nextId as a string', { ...VALID_DATA, nextId: '23' }],
    ['nextId null', { ...VALID_DATA, nextId: null }],
    ['missing spots', withoutKey(VALID_DATA, 'spots')],
    ['spots as an object', { ...VALID_DATA, spots: { 0: VALID_SPOT } }],
    ['spots as a string', { ...VALID_DATA, spots: '[]' }],
    ['spots null', { ...VALID_DATA, spots: null }],
    ['a null spot', withSpot(null)],
    ['a spot that is a string', withSpot('大観山')],
    ['a spot that is a number', withSpot(22)],
    ['a spot without id', withSpot(withoutKey(VALID_SPOT, 'id'))],
    ['a spot with id as a string', withSpot({ ...VALID_SPOT, id: '22' })],
    ['a spot without name', withSpot(withoutKey(VALID_SPOT, 'name'))],
    ['a spot with name as a number', withSpot({ ...VALID_SPOT, name: 123 })],
    ['a spot without region', withSpot(withoutKey(VALID_SPOT, 'region'))],
    ['a spot with region null', withSpot({ ...VALID_SPOT, region: null })],
    ['a spot without category', withSpot(withoutKey(VALID_SPOT, 'category'))],
    ['a spot with an unknown category', withSpot({ ...VALID_SPOT, category: '林道' })],
    ["a spot with the filter value 'すべて' as category", withSpot({ ...VALID_SPOT, category: 'すべて' })],
    ['a spot without distanceKm', withSpot(withoutKey(VALID_SPOT, 'distanceKm'))],
    ['a spot with distanceKm as a number', withSpot({ ...VALID_SPOT, distanceKm: 60 })],
    ['a spot without season', withSpot(withoutKey(VALID_SPOT, 'season'))],
    ['a spot with season null', withSpot({ ...VALID_SPOT, season: null })],
    ['a spot without memo', withSpot(withoutKey(VALID_SPOT, 'memo'))],
    ['a spot with memo as a number', withSpot({ ...VALID_SPOT, memo: 0 })],
    ['a spot without done', withSpot(withoutKey(VALID_SPOT, 'done'))],
    ["a spot with done as the string 'false'", withSpot({ ...VALID_SPOT, done: 'false' })],
    ['a spot with done as 0', withSpot({ ...VALID_SPOT, done: 0 })],
    [
      'one bad spot among valid ones',
      { ...VALID_DATA, spots: [VALID_SPOT, { ...VALID_DONE_SPOT, category: '林道' }] },
    ],
  ])('AC14: rejects a payload with %s', (_description, payload) => {
    expect(parseSpotsData(JSON.stringify(payload))).toBeNull()
  })
})

describe('loadSpotsData', () => {
  it('AC15: returns the seed data with persistent false when storage is null', () => {
    const result = loadSpotsData(null)

    expect(result).toEqual({ data: createSeedData(), persistent: false })
  })

  it('AC15: returns the seed data with persistent false when getItem throws', () => {
    const storage = createMemoryStorage()
    vi.spyOn(storage, 'getItem').mockImplementation(throwSecurityError)

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: createSeedData(), persistent: false })
  })

  it('AC1: returns the seed data with persistent true when nothing is saved, and writes nothing', () => {
    const storage = createMemoryStorage()
    const setItemSpy = vi.spyOn(storage, 'setItem')

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: createSeedData(), persistent: true })
    expect(setItemSpy).not.toHaveBeenCalled()
    expect(storage.length).toBe(0)
  })

  it('AC13: returns the saved data with persistent true and writes no backup', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(VALID_DATA) })

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: VALID_DATA, persistent: true })
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it('AC13: keeps a saved empty list empty (does not fall back to the seed data)', () => {
    const emptyData: SpotsData = { version: 1, nextId: 20, spots: [] }
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(emptyData) })

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: emptyData, persistent: true })
  })

  it.each([
    ['broken JSON', '{broken'],
    ['a wrong version', JSON.stringify({ ...VALID_DATA, version: 2 })],
    ['a wrong shape', JSON.stringify({ spots: 'none' })],
  ])(
    'AC14: starts from the seed data and copies %s to the backup key',
    (_description, corruptRaw) => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: corruptRaw })

      const result = loadSpotsData(storage)

      expect(result).toEqual({ data: createSeedData(), persistent: true })
      expect(storage.getItem(BACKUP_KEY)).toBe(corruptRaw)
    },
  )

  it('AC14: a failing backup write returns the seed data with persistent false (no throw)', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{broken' })
    vi.spyOn(storage, 'setItem').mockImplementation(throwQuotaExceededError)

    let result: ReturnType<typeof loadSpotsData> | undefined
    expect(() => {
      result = loadSpotsData(storage)
    }).not.toThrow()

    expect(result).toEqual({ data: createSeedData(), persistent: false })
  })

  it('AC14: a failing backup write leaves the original string under the main key', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: '{broken' })
    vi.spyOn(storage, 'setItem').mockImplementation(throwQuotaExceededError)

    loadSpotsData(storage)

    expect(storage.getItem(STORAGE_KEY)).toBe('{broken')
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it('AC13: loads what saveSpotsData wrote', () => {
    const storage = createMemoryStorage()

    saveSpotsData(storage, VALID_DATA)
    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: VALID_DATA, persistent: true })
  })
})

describe('saveSpotsData', () => {
  it("AC13: writes { version: 1, nextId, spots } as JSON under 'drive-spots:v1' and returns true", () => {
    const storage = createMemoryStorage()

    const saved = saveSpotsData(storage, VALID_DATA)

    expect(saved).toBe(true)
    const raw = storage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '')).toEqual(VALID_DATA)
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it('AC13: overwrites the previous save', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(VALID_DATA) })
    const nextData: SpotsData = { version: 1, nextId: 23, spots: [VALID_DONE_SPOT] }

    saveSpotsData(storage, nextData)

    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '')).toEqual(nextData)
  })

  it('AC15: returns false when storage is null', () => {
    expect(saveSpotsData(null, VALID_DATA)).toBe(false)
  })

  it('AC15: returns false without throwing when setItem throws (e.g. quota exceeded)', () => {
    const storage = createMemoryStorage()
    vi.spyOn(storage, 'setItem').mockImplementation(throwQuotaExceededError)

    let saved: boolean | undefined
    expect(() => {
      saved = saveSpotsData(storage, VALID_DATA)
    }).not.toThrow()

    expect(saved).toBe(false)
  })

  it('does not mutate the data', () => {
    const storage = createMemoryStorage()
    const data = structuredClone(VALID_DATA)

    saveSpotsData(storage, data)

    expect(data).toEqual(VALID_DATA)
  })
})

describe('updateSpotsData', () => {
  // The screen of THIS tab still shows VALID_DATA (the fallback). Meanwhile another tab saved
  // OTHER_TAB_DATA: it added OTHER_TAB_SPOT (id 23) and moved nextId to 24.
  const OTHER_TAB_SPOT: Spot = {
    id: 23,
    name: '銚子ドーバーライン',
    region: '千葉',
    category: '海沿い',
    distanceKm: '',
    season: '',
    memo: '',
    done: false,
  }
  const OTHER_TAB_DATA: SpotsData = {
    version: 1,
    nextId: 24,
    spots: [OTHER_TAB_SPOT, VALID_SPOT, VALID_DONE_SPOT],
  }
  const NEW_SPOT_INPUT: SpotInput = {
    name: '大観山',
    region: '神奈川',
    category: '絶景ロード',
    distanceKm: '',
    season: '',
    memo: '',
  }
  const CORRUPT_RAW = '{"version":1,"nextId":'

  /** The return shape fixed by docs/product/architecture.md. */
  type UpdateResult = { data: SpotsData; saved: boolean }

  /** The change used by most tests: move VALID_DONE_SPOT back to 行きたい. */
  function createToggleChange() {
    return vi.fn((data: SpotsData) => toggleDone(data, VALID_DONE_SPOT.id))
  }

  function readMainKey(storage: Storage): unknown {
    const raw = storage.getItem(STORAGE_KEY)
    return raw === null ? null : JSON.parse(raw)
  }

  /** Makes setItem throw for one key only; every other key is written normally. */
  function failSetItemFor(storage: Storage, failingKey: string) {
    const originalSetItem = storage.setItem.bind(storage)
    return vi.spyOn(storage, 'setItem').mockImplementation((key, value) => {
      if (key === failingKey) throwQuotaExceededError()
      originalSetItem(key, value)
    })
  }

  describe('no readable storage (AC15)', () => {
    it('AC15: with storage null it applies the change to the fallback and returns saved false', () => {
      const change = createToggleChange()

      const result = updateSpotsData(null, VALID_DATA, change)

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false })
      expect(change).toHaveBeenCalledWith(VALID_DATA)
    })

    it('AC15: when getItem throws it writes nothing at all (no backup, no data) and returns saved false', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(OTHER_TAB_DATA) })
      vi.spyOn(storage, 'getItem').mockImplementation(throwSecurityError)
      const setItemSpy = vi.spyOn(storage, 'setItem')

      let result: UpdateResult | undefined
      expect(() => {
        result = updateSpotsData(storage, VALID_DATA, createToggleChange())
      }).not.toThrow()

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false })
      expect(setItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('nothing saved yet (AC13)', () => {
    it('AC13: writes the change applied to the fallback and returns saved true', () => {
      const storage = createMemoryStorage()
      const change = createToggleChange()

      const result = updateSpotsData(storage, VALID_DATA, change)

      const expectedData = toggleDone(VALID_DATA, VALID_DONE_SPOT.id)
      expect(result).toEqual({ data: expectedData, saved: true })
      expect(change).toHaveBeenCalledWith(VALID_DATA)
      expect(readMainKey(storage)).toEqual(expectedData)
      expect(storage.getItem(BACKUP_KEY)).toBeNull()
    })
  })

  describe('valid saved data (AC22)', () => {
    it('AC22: applies the change on top of the re-read saved data, so a spot added in another tab survives', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(OTHER_TAB_DATA) })
      const change = createToggleChange()

      const result: UpdateResult = updateSpotsData(storage, VALID_DATA, change)

      const expectedData = toggleDone(OTHER_TAB_DATA, VALID_DONE_SPOT.id)
      expect(result).toEqual({ data: expectedData, saved: true })
      expect(change).toHaveBeenCalledTimes(1)
      expect(change).toHaveBeenCalledWith(OTHER_TAB_DATA)
      expect(readMainKey(storage)).toEqual(expectedData)
      expect(result.data.spots).toContainEqual(OTHER_TAB_SPOT)
      expect(result.data.spots.find((spot) => spot.id === VALID_DONE_SPOT.id)?.done).toBe(false)
    })

    it('AC22/AC16: a spot added here takes its id from the saved nextId, not from the fallback', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(OTHER_TAB_DATA) })

      const result: UpdateResult = updateSpotsData(storage, VALID_DATA, (data: SpotsData) =>
        addSpot(data, NEW_SPOT_INPUT),
      )

      expect(result.saved).toBe(true)
      expect(result.data.nextId).toBe(25)
      expect(result.data.spots.map((spot) => spot.id)).toEqual([24, 23, 22, 3])
      expect(result.data.spots[0]).toMatchObject({ id: 24, name: '大観山' })
      const savedRaw = storage.getItem(STORAGE_KEY) ?? ''
      // Two tabs adding one spot each must not produce duplicate ids (that would be corrupt data).
      expect(parseSpotsData(savedRaw)).toEqual(result.data)
    })

    it('AC22: a spot deleted in another tab stays deleted', () => {
      const dataWithoutValidSpot: SpotsData = { version: 1, nextId: 23, spots: [VALID_DONE_SPOT] }
      const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(dataWithoutValidSpot) })

      const result: UpdateResult = updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(result.data.spots.map((spot) => spot.id)).toEqual([VALID_DONE_SPOT.id])
      expect(readMainKey(storage)).toEqual(result.data)
    })

    it('AC22: does not touch the backup key when the saved data is valid', () => {
      const storage = createMemoryStorage({
        [STORAGE_KEY]: JSON.stringify(OTHER_TAB_DATA),
        [BACKUP_KEY]: 'an older backup',
      })

      updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(storage.getItem(BACKUP_KEY)).toBe('an older backup')
    })
  })

  describe('corrupt saved data (AC14)', () => {
    it('AC14: when the backup already holds the same string, writes the change applied to the fallback', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: CORRUPT_RAW, [BACKUP_KEY]: CORRUPT_RAW })
      const change = createToggleChange()

      const result = updateSpotsData(storage, VALID_DATA, change)

      const expectedData = toggleDone(VALID_DATA, VALID_DONE_SPOT.id)
      expect(result).toEqual({ data: expectedData, saved: true })
      expect(change).toHaveBeenCalledWith(VALID_DATA)
      expect(readMainKey(storage)).toEqual(expectedData)
      expect(storage.getItem(BACKUP_KEY)).toBe(CORRUPT_RAW)
    })

    it('AC14: when the backup already holds the same string, writes even if a new backup write would fail', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: CORRUPT_RAW, [BACKUP_KEY]: CORRUPT_RAW })
      failSetItemFor(storage, BACKUP_KEY)

      const result = updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(result.saved).toBe(true)
      expect(readMainKey(storage)).toEqual(toggleDone(VALID_DATA, VALID_DONE_SPOT.id))
    })

    it('AC14: without a backup, backs the corrupt string up first and then writes the change applied to the fallback', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: CORRUPT_RAW })
      const setItemSpy = vi.spyOn(storage, 'setItem')

      const result = updateSpotsData(storage, VALID_DATA, createToggleChange())

      const expectedData = toggleDone(VALID_DATA, VALID_DONE_SPOT.id)
      expect(result).toEqual({ data: expectedData, saved: true })
      expect(setItemSpy.mock.calls.map(([key]) => key)).toEqual([BACKUP_KEY, STORAGE_KEY])
      expect(storage.getItem(BACKUP_KEY)).toBe(CORRUPT_RAW)
      expect(readMainKey(storage)).toEqual(expectedData)
    })

    it('AC14: with a different (older) backup, backs the current corrupt string up and then writes', () => {
      const storage = createMemoryStorage({
        [STORAGE_KEY]: CORRUPT_RAW,
        [BACKUP_KEY]: 'an older corrupt string',
      })

      const result = updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(result.saved).toBe(true)
      expect(storage.getItem(BACKUP_KEY)).toBe(CORRUPT_RAW)
      expect(readMainKey(storage)).toEqual(toggleDone(VALID_DATA, VALID_DONE_SPOT.id))
    })

    it('AC14: when the backup write fails, does not overwrite the original and returns saved false', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: CORRUPT_RAW })
      failSetItemFor(storage, BACKUP_KEY)

      let result: UpdateResult | undefined
      expect(() => {
        result = updateSpotsData(storage, VALID_DATA, createToggleChange())
      }).not.toThrow()

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false })
      expect(storage.getItem(STORAGE_KEY)).toBe(CORRUPT_RAW)
      expect(storage.getItem(BACKUP_KEY)).toBeNull()
    })
  })

  describe('failing write (AC15)', () => {
    it('AC15: when setItem throws with nothing saved, returns the change applied to the fallback and saved false', () => {
      const storage = createMemoryStorage()
      vi.spyOn(storage, 'setItem').mockImplementation(throwQuotaExceededError)

      let result: UpdateResult | undefined
      expect(() => {
        result = updateSpotsData(storage, VALID_DATA, createToggleChange())
      }).not.toThrow()

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false })
    })

    it('AC15/AC22: when setItem throws over valid saved data, returns the change applied to the saved data and saved false', () => {
      const savedRaw = JSON.stringify(OTHER_TAB_DATA)
      const storage = createMemoryStorage({ [STORAGE_KEY]: savedRaw })
      failSetItemFor(storage, STORAGE_KEY)

      const result = updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(result).toEqual({ data: toggleDone(OTHER_TAB_DATA, VALID_DONE_SPOT.id), saved: false })
      expect(storage.getItem(STORAGE_KEY)).toBe(savedRaw)
    })
  })

  it('does not mutate the fallback', () => {
    const storage = createMemoryStorage()
    const fallback = structuredClone(VALID_DATA)

    updateSpotsData(storage, fallback, createToggleChange())

    expect(fallback).toEqual(VALID_DATA)
  })
})
