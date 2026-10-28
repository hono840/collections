import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSeedData } from './seed'
import { addSpot, toggleDone } from './spots'
import {
  BACKUP_KEY,
  LAST_BACKUP_KEY,
  MAX_NEXT_ID,
  STORAGE_KEY,
  getBrowserStorage,
  isNewerVersionValue,
  loadSpotsData,
  parseSpotsData,
  parseSpotsValue,
  readLastBackupAt,
  readSavedSpots,
  saveSpotsData,
  updateSpotsData,
  writeLastBackupAt,
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

/**
 * Payloads that are corrupt for AC14 (and for backup files, AC34). Every entry is rejected by
 * parseSpotsData (as JSON text) and parseSpotsValue (as the parsed value). None of them is a newer
 * version (AC30): version 2 and up is listed in NEWER_VERSION_PAYLOADS instead.
 */
const CORRUPT_PAYLOADS: [string, unknown][] = [
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
  ['version 0', { ...VALID_DATA, version: 0 }],
  ['version 1.5', { ...VALID_DATA, version: 1.5 }],
  ['nextId 0', { ...VALID_DATA, nextId: 0 }],
  ['nextId 1.5', { ...VALID_DATA, nextId: 1.5 }],
  ['a spot with id 0', withSpot({ ...VALID_SPOT, id: 0 })],
  ['duplicate spot ids', { ...VALID_DATA, spots: [VALID_SPOT, { ...VALID_DONE_SPOT, id: VALID_SPOT.id }] }],
  ['a spot id equal to nextId', withSpot({ ...VALID_SPOT, id: VALID_DATA.nextId })],
  ["version as the string '2' (corrupt, not a newer version)", { ...VALID_DATA, version: '2' }],
  ['version 2.5 (not an integer)', { ...VALID_DATA, version: 2.5 }],
  ['version 2^53 (not a safe integer)', { ...VALID_DATA, version: 2 ** 53 }],
  ['nextId 1,000,000,001 (above MAX_NEXT_ID, AC16)', { ...VALID_DATA, nextId: 1_000_000_001 }],
  ['nextId Number.MAX_SAFE_INTEGER (above MAX_NEXT_ID, AC16)', { ...VALID_DATA, nextId: Number.MAX_SAFE_INTEGER }],
]

/** The largest data AC16 allows: nextId exactly MAX_NEXT_ID, a spot right below it. */
const LARGEST_NEXT_ID_DATA: SpotsData = {
  version: 1,
  nextId: 1_000_000_000,
  spots: [{ ...VALID_SPOT, id: 999_999_999 }],
}
const ABOVE_MAX_NEXT_ID_RAW = JSON.stringify({ ...VALID_DATA, nextId: 1_000_000_001 })

/** Saved by a newer version of the app (AC30): never corrupt, whatever the rest looks like. */
const NEWER_VERSION_PAYLOADS: [string, Record<string, unknown>][] = [
  ['version 2 with the v1 shape', { ...VALID_DATA, version: 2 }],
  ['version 2 in a shape this version does not know', { version: 2, places: [{ title: '大観山' }] }],
  ['version 2 alone', { version: 2 }],
  ['version 3 with fields this version would reject', { version: 3, nextId: 'x', spots: null }],
  ['version 100', { version: 100 }],
  ['the largest safe integer as version', { version: Number.MAX_SAFE_INTEGER }],
]

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

  it('AC14/AC30: rejects version 2 (parseSpotsData itself only reads version 1)', () => {
    expect(parseSpotsData(JSON.stringify({ ...VALID_DATA, version: 2 }))).toBeNull()
  })

  it.each(CORRUPT_PAYLOADS)('AC14: rejects a payload with %s', (_description, payload) => {
    expect(parseSpotsData(JSON.stringify(payload))).toBeNull()
  })
})

describe('loadSpotsData', () => {
  it('AC15: returns the seed data with persistent false when storage is null', () => {
    const result = loadSpotsData(null)

    expect(result).toEqual({ data: createSeedData(), persistent: false, newerVersion: false, hasSavedData: false })
  })

  it('AC15: returns the seed data with persistent false when getItem throws', () => {
    const storage = createMemoryStorage()
    vi.spyOn(storage, 'getItem').mockImplementation(throwSecurityError)

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: createSeedData(), persistent: false, newerVersion: false, hasSavedData: false })
  })

  it('AC1: returns the seed data with persistent true when nothing is saved, and writes nothing', () => {
    const storage = createMemoryStorage()
    const setItemSpy = vi.spyOn(storage, 'setItem')

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: createSeedData(), persistent: true, newerVersion: false, hasSavedData: false })
    expect(setItemSpy).not.toHaveBeenCalled()
    expect(storage.length).toBe(0)
  })

  it('AC13: returns the saved data with persistent true and writes no backup', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(VALID_DATA) })

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: VALID_DATA, persistent: true, newerVersion: false, hasSavedData: true })
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it('AC13: keeps a saved empty list empty (does not fall back to the seed data)', () => {
    const emptyData: SpotsData = { version: 1, nextId: 20, spots: [] }
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(emptyData) })

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: emptyData, persistent: true, newerVersion: false, hasSavedData: true })
  })

  // version 2 and up is AC30 (a newer app), not corrupt: see 'loadSpotsData: data saved by a newer version'.
  it.each([
    ['broken JSON', '{broken'],
    ["a version given as the string '2'", JSON.stringify({ ...VALID_DATA, version: '2' })],
    ['version 0', JSON.stringify({ ...VALID_DATA, version: 0 })],
    ['version 1.5', JSON.stringify({ ...VALID_DATA, version: 1.5 })],
    ['a wrong shape', JSON.stringify({ spots: 'none' })],
  ])(
    'AC14: starts from the seed data and copies %s to the backup key',
    (_description, corruptRaw) => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: corruptRaw })

      const result = loadSpotsData(storage)

      expect(result).toEqual({ data: createSeedData(), persistent: true, newerVersion: false, hasSavedData: false })
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

    expect(result).toEqual({ data: createSeedData(), persistent: false, newerVersion: false, hasSavedData: false })
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

    expect(result).toEqual({ data: VALID_DATA, persistent: true, newerVersion: false, hasSavedData: true })
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
  type UpdateResult = { data: SpotsData; saved: boolean; newerVersion: boolean }

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

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false, newerVersion: false })
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

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false, newerVersion: false })
      expect(setItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('nothing saved yet (AC13)', () => {
    it('AC13: writes the change applied to the fallback and returns saved true', () => {
      const storage = createMemoryStorage()
      const change = createToggleChange()

      const result = updateSpotsData(storage, VALID_DATA, change)

      const expectedData = toggleDone(VALID_DATA, VALID_DONE_SPOT.id)
      expect(result).toEqual({ data: expectedData, saved: true, newerVersion: false })
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
      expect(result).toEqual({ data: expectedData, saved: true, newerVersion: false })
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
      expect(result).toEqual({ data: expectedData, saved: true, newerVersion: false })
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
      expect(result).toEqual({ data: expectedData, saved: true, newerVersion: false })
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

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false, newerVersion: false })
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

      expect(result).toEqual({ data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id), saved: false, newerVersion: false })
    })

    it('AC15/AC22: when setItem throws over valid saved data, returns the change applied to the saved data and saved false', () => {
      const savedRaw = JSON.stringify(OTHER_TAB_DATA)
      const storage = createMemoryStorage({ [STORAGE_KEY]: savedRaw })
      failSetItemFor(storage, STORAGE_KEY)

      const result = updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(result).toEqual({ data: toggleDone(OTHER_TAB_DATA, VALID_DONE_SPOT.id), saved: false, newerVersion: false })
      expect(storage.getItem(STORAGE_KEY)).toBe(savedRaw)
    })
  })

  describe('data saved by a newer version (AC30)', () => {
    it.each(NEWER_VERSION_PAYLOADS)(
      'AC30: with %s it applies the change to the fallback, writes nothing and returns newerVersion true',
      (_description, payload) => {
        const newerRaw = JSON.stringify(payload)
        const storage = createMemoryStorage({ [STORAGE_KEY]: newerRaw })
        const setItemSpy = vi.spyOn(storage, 'setItem')
        const change = createToggleChange()

        const result: UpdateResult = updateSpotsData(storage, VALID_DATA, change)

        expect(result).toEqual({
          data: toggleDone(VALID_DATA, VALID_DONE_SPOT.id),
          saved: false,
          newerVersion: true,
        })
        expect(change).toHaveBeenCalledTimes(1)
        expect(change).toHaveBeenCalledWith(VALID_DATA)
        expect(setItemSpy).not.toHaveBeenCalled()
        expect(storage.getItem(STORAGE_KEY)).toBe(newerRaw)
        expect(storage.getItem(BACKUP_KEY)).toBeNull()
      },
    )

    it('AC30: never removes or clears anything either', () => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 2 }) })
      const removeItemSpy = vi.spyOn(storage, 'removeItem')
      const clearSpy = vi.spyOn(storage, 'clear')

      updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(removeItemSpy).not.toHaveBeenCalled()
      expect(clearSpy).not.toHaveBeenCalled()
    })

    it('AC30: leaves an existing backup as it was', () => {
      const storage = createMemoryStorage({
        [STORAGE_KEY]: JSON.stringify({ version: 2 }),
        [BACKUP_KEY]: 'an older backup',
      })

      updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(storage.getItem(BACKUP_KEY)).toBe('an older backup')
    })

    it('AC30: does not write even when the backup key already holds the same string (unlike corrupt data, AC14)', () => {
      const newerRaw = JSON.stringify({ ...VALID_DATA, version: 2 })
      const storage = createMemoryStorage({ [STORAGE_KEY]: newerRaw, [BACKUP_KEY]: newerRaw })
      const setItemSpy = vi.spyOn(storage, 'setItem')

      const result: UpdateResult = updateSpotsData(storage, VALID_DATA, createToggleChange())

      expect(result.saved).toBe(false)
      expect(result.newerVersion).toBe(true)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(storage.getItem(STORAGE_KEY)).toBe(newerRaw)
    })

    it("AC30/AC14: version '2' as a string is corrupt: it is backed up, the change is written and newerVersion is false", () => {
      const corruptRaw = JSON.stringify({ ...VALID_DATA, version: '2' })
      const storage = createMemoryStorage({ [STORAGE_KEY]: corruptRaw })

      const result: UpdateResult = updateSpotsData(storage, VALID_DATA, createToggleChange())

      const expectedData = toggleDone(VALID_DATA, VALID_DONE_SPOT.id)
      expect(result).toEqual({ data: expectedData, saved: true, newerVersion: false })
      expect(storage.getItem(BACKUP_KEY)).toBe(corruptRaw)
      expect(readMainKey(storage)).toEqual(expectedData)
    })
  })

  it('does not mutate the fallback', () => {
    const storage = createMemoryStorage()
    const fallback = structuredClone(VALID_DATA)

    updateSpotsData(storage, fallback, createToggleChange())

    expect(fallback).toEqual(VALID_DATA)
  })
})

describe('parseSpotsValue', () => {
  it('AC13: returns the same data for a valid parsed value', () => {
    expect(parseSpotsValue(structuredClone(VALID_DATA))).toEqual(VALID_DATA)
  })

  it('AC13: accepts an empty spot list', () => {
    const emptyData: SpotsData = { version: 1, nextId: 20, spots: [] }

    expect(parseSpotsValue(structuredClone(emptyData))).toEqual(emptyData)
  })

  it('AC13: accepts the seed data', () => {
    const seedData = createSeedData()

    expect(parseSpotsValue(structuredClone(seedData))).toEqual(seedData)
  })

  it('AC13: keeps only the known fields, like parseSpotsData', () => {
    const valueWithExtras = {
      ...VALID_DATA,
      extra: 'top level',
      spots: VALID_DATA.spots.map((spot) => ({ ...spot, photo: 'x.jpg' })),
    }

    expect(parseSpotsValue(valueWithExtras)).toEqual(VALID_DATA)
    expect(parseSpotsValue(valueWithExtras)).toEqual(parseSpotsData(JSON.stringify(valueWithExtras)))
  })

  it.each(CORRUPT_PAYLOADS)('AC14: returns null for a value with %s (same strictness as parseSpotsData)', (_description, payload) => {
    expect(parseSpotsValue(payload)).toBeNull()
    expect(parseSpotsData(JSON.stringify(payload))).toBeNull()
  })

  it.each<[string, unknown]>([
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['a string', 'drive-spots'],
    ['a boolean', true],
    ['an array', []],
    ['the JSON text of valid data (not parsed yet)', JSON.stringify(VALID_DATA)],
  ])('AC14: returns null for %s', (_description, value) => {
    expect(parseSpotsValue(value)).toBeNull()
  })

  it.each(NEWER_VERSION_PAYLOADS)('AC30: returns null for %s (this version cannot read it)', (_description, payload) => {
    expect(parseSpotsValue(payload)).toBeNull()
  })

  it('does not mutate the value', () => {
    const value = structuredClone(VALID_DATA)

    parseSpotsValue(value)

    expect(value).toEqual(VALID_DATA)
  })
})

describe('isNewerVersionValue', () => {
  it.each(NEWER_VERSION_PAYLOADS)('AC30: is true for %s', (_description, payload) => {
    expect(isNewerVersionValue(payload)).toBe(true)
  })

  it.each<[string, unknown]>([
    ['version 1 (this version)', VALID_DATA],
    ['version 0', { version: 0 }],
    ['version -2', { version: -2 }],
    ['version 1.5', { version: 1.5 }],
    ['version 2.5 (not an integer)', { version: 2.5 }],
    ["version as the string '2'", { version: '2' }],
    ['version 2^53 (not a safe integer)', { version: 2 ** 53 }],
    ['version Infinity', { version: Number.POSITIVE_INFINITY }],
    ['version NaN', { version: Number.NaN }],
    ['version null', { version: null }],
    ['no version', { nextId: 2, spots: [] }],
    ['null', null],
    ['undefined', undefined],
    ['the number 2', 2],
    ['the JSON text {"version":2} (not parsed yet)', '{"version":2}'],
    ['an array', [2]],
  ])('AC30/AC14: is false for %s', (_description, value) => {
    expect(isNewerVersionValue(value)).toBe(false)
  })
})

describe('readSavedSpots', () => {
  it('AC15: is unreadable when storage is null', () => {
    expect(readSavedSpots(null)).toEqual({ kind: 'unreadable' })
  })

  it('AC15: is unreadable (and does not throw) when getItem throws', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(VALID_DATA) })
    vi.spyOn(storage, 'getItem').mockImplementation(throwSecurityError)

    expect(readSavedSpots(storage)).toEqual({ kind: 'unreadable' })
  })

  it('AC1: is nothing when nothing is saved', () => {
    expect(readSavedSpots(createMemoryStorage())).toEqual({ kind: 'nothing' })
  })

  it('AC13: is valid with the saved data', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(VALID_DATA) })

    expect(readSavedSpots(storage)).toEqual({ kind: 'valid', data: VALID_DATA })
  })

  it.each<[string, string]>([
    ['broken JSON', '{broken'],
    ['an empty string', ''],
    ['JSON null', 'null'],
    ["version as the string '2'", JSON.stringify({ ...VALID_DATA, version: '2' })],
    ['version 0', JSON.stringify({ ...VALID_DATA, version: 0 })],
    ['a wrong shape', JSON.stringify({ spots: 'none' })],
    ['duplicate spot ids', JSON.stringify({ ...VALID_DATA, spots: [VALID_SPOT, VALID_SPOT] })],
  ])('AC14: is corrupt for %s', (_description, raw) => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: raw })

    expect(readSavedSpots(storage).kind).toBe('corrupt')
  })

  it.each(NEWER_VERSION_PAYLOADS)('AC30: is newer (not corrupt) for %s', (_description, payload) => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(payload) })

    expect(readSavedSpots(storage).kind).toBe('newer')
  })

  it.each<[string, string | null]>([
    ['nothing saved', null],
    ['valid data', JSON.stringify(VALID_DATA)],
    ['corrupt data', '{broken'],
    ['newer data', JSON.stringify({ version: 2 })],
  ])('AC22: only reads (no setItem / removeItem / clear) with %s', (_description, raw) => {
    const storage = createMemoryStorage(raw === null ? {} : { [STORAGE_KEY]: raw })
    const setItemSpy = vi.spyOn(storage, 'setItem')
    const removeItemSpy = vi.spyOn(storage, 'removeItem')
    const clearSpy = vi.spyOn(storage, 'clear')

    readSavedSpots(storage)

    expect(setItemSpy).not.toHaveBeenCalled()
    expect(removeItemSpy).not.toHaveBeenCalled()
    expect(clearSpy).not.toHaveBeenCalled()
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })
})

describe('loadSpotsData: data saved by a newer version (AC30)', () => {
  it.each(NEWER_VERSION_PAYLOADS)(
    'AC30: with %s it returns the seed data, persistent false and newerVersion true',
    (_description, payload) => {
      const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(payload) })

      const result = loadSpotsData(storage)

      expect(result).toEqual({ data: createSeedData(), persistent: false, newerVersion: true, hasSavedData: false })
    },
  )

  it.each(NEWER_VERSION_PAYLOADS)('AC30: with %s it neither backs up nor overwrites anything', (_description, payload) => {
    const newerRaw = JSON.stringify(payload)
    const storage = createMemoryStorage({ [STORAGE_KEY]: newerRaw })
    const setItemSpy = vi.spyOn(storage, 'setItem')
    const removeItemSpy = vi.spyOn(storage, 'removeItem')
    const clearSpy = vi.spyOn(storage, 'clear')

    loadSpotsData(storage)

    expect(setItemSpy).not.toHaveBeenCalled()
    expect(removeItemSpy).not.toHaveBeenCalled()
    expect(clearSpy).not.toHaveBeenCalled()
    expect(storage.getItem(STORAGE_KEY)).toBe(newerRaw)
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it('AC30: leaves an existing backup as it was', () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify({ ...VALID_DATA, version: 2 }),
      [BACKUP_KEY]: 'an older backup',
    })

    loadSpotsData(storage)

    expect(storage.getItem(BACKUP_KEY)).toBe('an older backup')
  })

  it("AC30/AC14: version '2' as a string is still corrupt: backed up, persistent true, newerVersion false", () => {
    const corruptRaw = JSON.stringify({ ...VALID_DATA, version: '2' })
    const storage = createMemoryStorage({ [STORAGE_KEY]: corruptRaw })

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: createSeedData(), persistent: true, newerVersion: false, hasSavedData: false })
    expect(storage.getItem(BACKUP_KEY)).toBe(corruptRaw)
  })
})

describe('loadSpotsData: hasSavedData (AC38, AC39)', () => {
  it.each<[string, boolean, Record<string, string>]>([
    ['valid data', true, { [STORAGE_KEY]: JSON.stringify(VALID_DATA) }],
    ['a valid empty list', true, { [STORAGE_KEY]: JSON.stringify({ version: 1, nextId: 20, spots: [] }) }],
    ['nothing saved', false, {}],
    ['corrupt data (backed up)', false, { [STORAGE_KEY]: '{broken' }],
    ['data saved by a newer version', false, { [STORAGE_KEY]: JSON.stringify({ version: 2 }) }],
    [
      'only a backup and a last-backup time',
      false,
      { [BACKUP_KEY]: '{broken', [LAST_BACKUP_KEY]: '2026-10-20T01:00:00.000Z' },
    ],
  ])('AC38/AC39: with %s, hasSavedData is %s', (_description, expected, items) => {
    expect(loadSpotsData(createMemoryStorage(items)).hasSavedData).toBe(expected)
  })

  it('AC38/AC39: hasSavedData is false when storage is null or getItem throws', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(VALID_DATA) })
    vi.spyOn(storage, 'getItem').mockImplementation(throwSecurityError)

    expect(loadSpotsData(null).hasSavedData).toBe(false)
    expect(loadSpotsData(storage).hasSavedData).toBe(false)
  })
})

describe('last backup time (AC33)', () => {
  const EXPORTED_AT = new Date('2026-10-20T01:23:45.678Z')

  it("AC33: is kept under 'drive-spots:v1:last-backup'", () => {
    expect(LAST_BACKUP_KEY).toBe('drive-spots:v1:last-backup')
  })

  describe('readLastBackupAt', () => {
    it('AC33: returns the saved ISO 8601 time as a Date', () => {
      const storage = createMemoryStorage({ [LAST_BACKUP_KEY]: EXPORTED_AT.toISOString() })

      const lastBackupAt = readLastBackupAt(storage)

      expect(lastBackupAt).toBeInstanceOf(Date)
      expect(lastBackupAt?.toISOString()).toBe(EXPORTED_AT.toISOString())
    })

    it('AC33: returns null when nothing is saved', () => {
      expect(readLastBackupAt(createMemoryStorage())).toBeNull()
    })

    it('AC33: returns null when storage is null', () => {
      expect(readLastBackupAt(null)).toBeNull()
    })

    it('AC33/AC15: returns null without throwing when getItem throws', () => {
      const storage = createMemoryStorage({ [LAST_BACKUP_KEY]: EXPORTED_AT.toISOString() })
      vi.spyOn(storage, 'getItem').mockImplementation(throwSecurityError)

      let lastBackupAt: Date | null | undefined
      expect(() => {
        lastBackupAt = readLastBackupAt(storage)
      }).not.toThrow()

      expect(lastBackupAt).toBeNull()
    })

    it.each(['', 'not a date', 'Invalid Date', '2026-10-32T00:00:00.000Z', '{"at":"2026-10-20"}'])(
      'AC33: returns null for the string %j, which is not a time',
      (raw) => {
        const storage = createMemoryStorage({ [LAST_BACKUP_KEY]: raw })

        expect(readLastBackupAt(storage)).toBeNull()
      },
    )

    it('AC33: reads only LAST_BACKUP_KEY and writes nothing', () => {
      const storage = createMemoryStorage({ [LAST_BACKUP_KEY]: EXPORTED_AT.toISOString() })
      const setItemSpy = vi.spyOn(storage, 'setItem')

      readLastBackupAt(storage)

      expect(setItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('writeLastBackupAt', () => {
    it('AC33: writes the ISO 8601 string under LAST_BACKUP_KEY and returns true', () => {
      const storage = createMemoryStorage()

      const written = writeLastBackupAt(storage, EXPORTED_AT)

      expect(written).toBe(true)
      expect(storage.getItem(LAST_BACKUP_KEY)).toBe('2026-10-20T01:23:45.678Z')
    })

    it('AC33: touches neither the spots nor the corrupt-data backup', () => {
      const savedRaw = JSON.stringify(VALID_DATA)
      const storage = createMemoryStorage({ [STORAGE_KEY]: savedRaw })

      writeLastBackupAt(storage, EXPORTED_AT)

      expect(storage.getItem(STORAGE_KEY)).toBe(savedRaw)
      expect(storage.getItem(BACKUP_KEY)).toBeNull()
      expect(storage.length).toBe(2)
    })

    it('AC33: overwrites the previous time', () => {
      const storage = createMemoryStorage({ [LAST_BACKUP_KEY]: '2026-09-01T00:00:00.000Z' })

      writeLastBackupAt(storage, EXPORTED_AT)

      expect(storage.getItem(LAST_BACKUP_KEY)).toBe(EXPORTED_AT.toISOString())
    })

    it('AC33: returns false when storage is null', () => {
      expect(writeLastBackupAt(null, EXPORTED_AT)).toBe(false)
    })

    it('AC33: returns false without throwing when setItem throws', () => {
      const storage = createMemoryStorage()
      vi.spyOn(storage, 'setItem').mockImplementation(throwQuotaExceededError)

      let written: boolean | undefined
      expect(() => {
        written = writeLastBackupAt(storage, EXPORTED_AT)
      }).not.toThrow()

      expect(written).toBe(false)
    })

    it('AC33: readLastBackupAt reads what writeLastBackupAt wrote', () => {
      const storage = createMemoryStorage()

      writeLastBackupAt(storage, EXPORTED_AT)

      expect(readLastBackupAt(storage)?.getTime()).toBe(EXPORTED_AT.getTime())
    })
  })
})

describe('MAX_NEXT_ID (AC16)', () => {
  it('AC16: is 1,000,000,000', () => {
    expect(MAX_NEXT_ID).toBe(1_000_000_000)
  })

  it('AC16: nextId exactly MAX_NEXT_ID is still valid (parseSpotsValue and parseSpotsData)', () => {
    expect(parseSpotsValue(structuredClone(LARGEST_NEXT_ID_DATA))).toEqual(LARGEST_NEXT_ID_DATA)
    expect(parseSpotsData(JSON.stringify(LARGEST_NEXT_ID_DATA))).toEqual(LARGEST_NEXT_ID_DATA)
  })

  it.each([1_000_000_001, 2 ** 31, Number.MAX_SAFE_INTEGER])('AC16: nextId %i is rejected', (nextId) => {
    const payload = { ...VALID_DATA, nextId }

    expect(parseSpotsValue(payload)).toBeNull()
    expect(parseSpotsData(JSON.stringify(payload))).toBeNull()
  })

  it('AC16: readSavedSpots reads nextId exactly MAX_NEXT_ID as valid and above it as corrupt', () => {
    const largestStorage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(LARGEST_NEXT_ID_DATA) })
    const aboveStorage = createMemoryStorage({ [STORAGE_KEY]: ABOVE_MAX_NEXT_ID_RAW })

    expect(readSavedSpots(largestStorage)).toEqual({ kind: 'valid', data: LARGEST_NEXT_ID_DATA })
    expect(readSavedSpots(aboveStorage).kind).toBe('corrupt')
  })

  it('AC16/AC14: loadSpotsData treats nextId 1,000,000,001 as corrupt: seed data, the original backed up', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: ABOVE_MAX_NEXT_ID_RAW })

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: createSeedData(), persistent: true, newerVersion: false, hasSavedData: false })
    expect(storage.getItem(BACKUP_KEY)).toBe(ABOVE_MAX_NEXT_ID_RAW)
  })

  it('AC16: loadSpotsData keeps data with nextId exactly MAX_NEXT_ID', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: JSON.stringify(LARGEST_NEXT_ID_DATA) })

    const result = loadSpotsData(storage)

    expect(result).toEqual({ data: LARGEST_NEXT_ID_DATA, persistent: true, newerVersion: false, hasSavedData: true })
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })

  it('AC16/AC14: updateSpotsData re-reading nextId above MAX_NEXT_ID backs it up and writes the change to the fallback', () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: ABOVE_MAX_NEXT_ID_RAW })

    const result = updateSpotsData(storage, VALID_DATA, (data) => toggleDone(data, VALID_DONE_SPOT.id))

    const expectedData = toggleDone(VALID_DATA, VALID_DONE_SPOT.id)
    expect(result).toEqual({ data: expectedData, saved: true, newerVersion: false })
    expect(storage.getItem(BACKUP_KEY)).toBe(ABOVE_MAX_NEXT_ID_RAW)
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '')).toEqual(expectedData)
  })
})
