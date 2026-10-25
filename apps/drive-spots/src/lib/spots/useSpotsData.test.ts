import { act, renderHook } from '@testing-library/react'
import { useLayoutEffect, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedData } from './seed'
import { BACKUP_KEY, STORAGE_KEY } from './storage'
import type { Spot, SpotInput, SpotsData } from './types'
import { useSpotsData } from './useSpotsData'

// useSpotsData against jsdom's real localStorage (cleared around every test).
// "Another tab" is simulated by writing localStorage directly; jsdom does not fire `storage` events
// in the same window, so the tests dispatch them by hand where the spec says the browser would.

const NEW_SPOT_INPUT: SpotInput = {
  name: '大観山',
  region: '神奈川',
  category: '絶景ロード',
  distanceKm: '',
  season: '',
  memo: '',
}

const OTHER_TAB_SPOT: Spot = {
  id: 20,
  name: '房総フラワーライン',
  region: '千葉',
  category: '海沿い',
  distanceKm: '',
  season: '',
  memo: '',
  done: false,
}

/** What another tab saved after this tab loaded: the seed plus one new spot (id 20, nextId 21). */
function createOtherTabData(): SpotsData {
  const seedData = createSeedData()
  return { version: 1, nextId: 21, spots: [OTHER_TAB_SPOT, ...seedData.spots] }
}

function writeSavedData(data: SpotsData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function readSavedData(): SpotsData | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === null ? null : (JSON.parse(raw) as SpotsData)
}

function dispatchStorageEvent(key: string | null) {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key }))
  })
}

function dispatchPageShow(persisted: boolean) {
  act(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted }))
  })
}

function throwSecurityError(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

function throwQuotaExceededError(): never {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

function findSpot(data: SpotsData | null, id: number): Spot | undefined {
  return data?.spots.find((spot) => spot.id === id)
}

/** Saved by a newer version of the app (AC30): a shape this version cannot read. */
const NEWER_VERSION_RAW = JSON.stringify({ version: 2, nextId: 40, places: [{ title: '大観山' }] })

/** What a valid backup file holds (AC36): its own spots and nextId. */
const IMPORTED_DATA: SpotsData = {
  version: 1,
  nextId: 50,
  spots: [
    {
      id: 41,
      name: '道志みち',
      region: '山梨・神奈川',
      category: '峠',
      distanceKm: '80',
      season: '新緑のころ',
      memo: '朝早く出る',
      done: false,
    },
    { id: 12, name: '碓氷峠', region: '群馬・長野', category: '峠', distanceKm: '', season: '', memo: '', done: true },
  ],
}

type SpotsHook = ReturnType<typeof useSpotsData>

/** Every action that writes (all of them go through updateSpotsData). */
const SPOT_ACTIONS: [string, (spotsData: SpotsHook) => void][] = [
  ['add', (spotsData) => spotsData.add(NEW_SPOT_INPUT)],
  ['toggleDone', (spotsData) => spotsData.toggleDone(1)],
  ['remove', (spotsData) => spotsData.remove(2)],
  ['updateMemo', (spotsData) => spotsData.updateMemo(1, '新しいメモ')],
  ['replaceAll', (spotsData) => spotsData.replaceAll(structuredClone(IMPORTED_DATA))],
]

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('useSpotsData', () => {
  describe('loading', () => {
    it('AC1: ready is false on the first render and true after mounting, with the seed data', () => {
      const readyHistory: boolean[] = []

      const { result } = renderHook(() => {
        const spotsData = useSpotsData()
        readyHistory.push(spotsData.ready)
        return spotsData
      })

      expect(readyHistory[0]).toBe(false)
      expect(result.current.ready).toBe(true)
      expect(result.current.data).toEqual(createSeedData())
      expect(result.current.persistent).toBe(true)
    })

    it('AC1: loading alone writes nothing', () => {
      renderHook(() => useSpotsData())

      expect(window.localStorage.length).toBe(0)
    })

    it('AC13: loads the saved data after mounting', () => {
      const otherTabData = createOtherTabData()
      writeSavedData(otherTabData)

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.data).toEqual(otherTabData)
      expect(result.current.persistent).toBe(true)
    })

    it('AC15: persistent is false when getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.ready).toBe(true)
      expect(result.current.data).toEqual(createSeedData())
      expect(result.current.persistent).toBe(false)
    })

    it('AC14: persistent is false when the corrupt data cannot be backed up', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.data).toEqual(createSeedData())
      expect(result.current.persistent).toBe(false)
    })
  })

  describe('actions before ready', () => {
    it('AC13: add / toggleDone / remove called before the saved data has been read do nothing', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const readyWhenActionsRan: boolean[] = []

      // A layout effect runs before the hook's own (passive) load effect, i.e. while ready is false.
      const { result } = renderHook(() => {
        const spotsData = useSpotsData()
        const actionsRanRef = useRef(false)
        useLayoutEffect(() => {
          if (actionsRanRef.current) return
          actionsRanRef.current = true
          readyWhenActionsRan.push(spotsData.ready)
          spotsData.add(NEW_SPOT_INPUT)
          spotsData.toggleDone(1)
          spotsData.remove(2)
        })
        return spotsData
      })

      expect(readyWhenActionsRan).toEqual([false])
      expect(result.current.ready).toBe(true)
      expect(result.current.data).toEqual(createSeedData())
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('actions (AC13)', () => {
    it('AC13: add, toggleDone and remove update data and save it', () => {
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.add(NEW_SPOT_INPUT))
      act(() => result.current.toggleDone(1))
      act(() => result.current.remove(2))

      const expectedIds = [20, 1, ...createSeedData().spots.map((spot) => spot.id).slice(2)]
      expect(result.current.data.spots.map((spot) => spot.id)).toEqual(expectedIds)
      expect(result.current.data.nextId).toBe(21)
      expect(findSpot(result.current.data, 1)?.done).toBe(true)
      expect(readSavedData()).toEqual(result.current.data)
      expect(result.current.persistent).toBe(true)
    })
  })

  describe('AC22: every write goes on top of the latest saved data', () => {
    it('AC22: toggleDone keeps a spot that another tab saved after this tab loaded', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      act(() => result.current.toggleDone(1))

      const savedData = readSavedData()
      expect(findSpot(savedData, OTHER_TAB_SPOT.id)).toEqual(OTHER_TAB_SPOT)
      expect(findSpot(savedData, 1)?.done).toBe(true)
      expect(savedData?.nextId).toBe(21)
      expect(result.current.data).toEqual(savedData)
    })

    it('AC22/AC16: add after another tab added a spot takes the next id instead of reusing it', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      act(() => result.current.add(NEW_SPOT_INPUT))

      const savedData = readSavedData()
      expect(savedData?.spots.slice(0, 2).map((spot) => [spot.id, spot.name])).toEqual([
        [21, '大観山'],
        [20, '房総フラワーライン'],
      ])
      expect(savedData?.nextId).toBe(22)
      expect(result.current.data).toEqual(savedData)
    })

    it('AC22: remove keeps a spot that another tab saved after this tab loaded', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      act(() => result.current.remove(1))

      const savedData = readSavedData()
      expect(findSpot(savedData, OTHER_TAB_SPOT.id)).toEqual(OTHER_TAB_SPOT)
      expect(findSpot(savedData, 1)).toBeUndefined()
      expect(savedData?.spots).toHaveLength(19)
    })
  })

  describe('AC15: persistent', () => {
    it('AC15: when getItem throws, actions still change the data in memory but never call setItem', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.toggleDone(1))
      act(() => result.current.add(NEW_SPOT_INPUT))

      expect(findSpot(result.current.data, 1)?.done).toBe(true)
      expect(result.current.data.spots[0]).toMatchObject({ id: 20, name: '大観山' })
      expect(result.current.persistent).toBe(false)
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('AC14/AC15: when the corrupt data could not be backed up, later actions never write (the original stays)', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')
      // Only the backup attempt while loading fails; storage would work again afterwards.
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementationOnce(throwQuotaExceededError)
      const { result } = renderHook(() => useSpotsData())
      const setItemCallsAfterLoad = setItemSpy.mock.calls.length

      act(() => result.current.toggleDone(1))

      expect(result.current.persistent).toBe(false)
      expect(findSpot(result.current.data, 1)?.done).toBe(true)
      expect(setItemSpy).toHaveBeenCalledTimes(setItemCallsAfterLoad)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{broken')
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })

    it('AC15: a failed save turns persistent off and keeps the change in memory', () => {
      const { result } = renderHook(() => useSpotsData())
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      act(() => result.current.toggleDone(1))

      expect(result.current.persistent).toBe(false)
      expect(findSpot(result.current.data, 1)?.done).toBe(true)
    })

    it('AC15: once off, persistent stays false even when storage works again', () => {
      const { result } = renderHook(() => useSpotsData())
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(throwQuotaExceededError)
      act(() => result.current.toggleDone(1))
      setItemSpy.mockRestore()

      act(() => result.current.toggleDone(2))

      expect(result.current.persistent).toBe(false)
      expect(findSpot(result.current.data, 2)?.done).toBe(true)
    })

    it('AC15: after a failed save, later actions do not try to write', () => {
      const { result } = renderHook(() => useSpotsData())
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementationOnce(throwQuotaExceededError)
      act(() => result.current.toggleDone(1))
      const setItemCallsAfterFailure = setItemSpy.mock.calls.length

      act(() => result.current.toggleDone(2))
      act(() => result.current.add(NEW_SPOT_INPUT))

      expect(setItemSpy).toHaveBeenCalledTimes(setItemCallsAfterFailure)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(findSpot(result.current.data, 2)?.done).toBe(true)
      expect(result.current.data.spots[0]).toMatchObject({ name: '大観山' })
    })
  })

  describe('updateMemo (AC24, AC26-AC28)', () => {
    /** The seed with the memo of one spot replaced; everything else as loaded. */
    function createSeedWithMemo(id: number, memo: string): SpotsData {
      const seedData = createSeedData()
      return {
        ...seedData,
        spots: seedData.spots.map((spot) => (spot.id === id ? { ...spot, memo } : spot)),
      }
    }

    /** What another tab saved after this tab loaded: the seed without the given spot. */
    function createOtherTabDataWithout(id: number): SpotsData {
      const seedData = createSeedData()
      return { ...seedData, spots: seedData.spots.filter((spot) => spot.id !== id) }
    }

    it('AC24/AC26: changes only that memo, trimmed, and saves it', () => {
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.updateMemo(1, '  朝7時に出発\n菜の花台で休憩　'))

      const expectedData = createSeedWithMemo(1, '朝7時に出発\n菜の花台で休憩')
      expect(result.current.data).toEqual(expectedData)
      expect(readSavedData()).toEqual(expectedData)
      expect(result.current.persistent).toBe(true)
      expect(result.current.ready).toBe(true)
    })

    it('AC24: a blank memo is saved as an empty memo', () => {
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.updateMemo(1, ' 　\n'))

      expect(findSpot(result.current.data, 1)?.memo).toBe('')
      expect(readSavedData()).toEqual(createSeedWithMemo(1, ''))
    })

    it('AC27/AC22: keeps a spot that another tab saved after this tab loaded', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      act(() => result.current.updateMemo(1, '新しいメモ'))

      const savedData = readSavedData()
      expect(findSpot(savedData, OTHER_TAB_SPOT.id)).toEqual(OTHER_TAB_SPOT)
      expect(findSpot(savedData, 1)?.memo).toBe('新しいメモ')
      expect(savedData?.spots).toHaveLength(20)
      expect(savedData?.nextId).toBe(21)
      expect(result.current.data).toEqual(savedData)
    })

    it('AC27: does not bring back a spot that another tab deleted after this tab loaded', () => {
      const { result } = renderHook(() => useSpotsData())
      const otherTabData = createOtherTabDataWithout(1)
      writeSavedData(otherTabData)

      act(() => result.current.updateMemo(1, '新しいメモ'))

      const savedData = readSavedData()
      expect(savedData).toEqual(otherTabData)
      expect(findSpot(savedData, 1)).toBeUndefined()
      expect(findSpot(result.current.data, 1)).toBeUndefined()
      expect(result.current.data).toEqual(otherTabData)
    })

    it('AC13: updateMemo called before the saved data has been read does nothing', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const readyWhenActionRan: boolean[] = []

      // A layout effect runs before the hook's own (passive) load effect, i.e. while ready is false.
      const { result } = renderHook(() => {
        const spotsData = useSpotsData()
        const actionRanRef = useRef(false)
        useLayoutEffect(() => {
          if (actionRanRef.current) return
          actionRanRef.current = true
          readyWhenActionRan.push(spotsData.ready)
          spotsData.updateMemo(1, '新しいメモ')
        })
        return spotsData
      })

      expect(readyWhenActionRan).toEqual([false])
      expect(result.current.ready).toBe(true)
      expect(result.current.data).toEqual(createSeedData())
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('AC28/AC15: when getItem throws, the memo changes in memory but setItem is never called', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.updateMemo(1, '  新しいメモ  '))

      expect(result.current.data).toEqual(createSeedWithMemo(1, '新しいメモ'))
      expect(result.current.persistent).toBe(false)
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('AC28/AC14: when the corrupt data could not be backed up, the memo changes in memory and the original stays', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')
      // Only the backup attempt while loading fails; storage would work again afterwards.
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementationOnce(throwQuotaExceededError)
      const { result } = renderHook(() => useSpotsData())
      const setItemCallsAfterLoad = setItemSpy.mock.calls.length

      act(() => result.current.updateMemo(1, '新しいメモ'))

      expect(findSpot(result.current.data, 1)?.memo).toBe('新しいメモ')
      expect(result.current.persistent).toBe(false)
      expect(setItemSpy).toHaveBeenCalledTimes(setItemCallsAfterLoad)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{broken')
    })

    it('AC28/AC15: a failed save turns persistent off and keeps the new memo in memory', () => {
      const { result } = renderHook(() => useSpotsData())
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      act(() => result.current.updateMemo(1, '新しいメモ'))

      expect(result.current.persistent).toBe(false)
      expect(findSpot(result.current.data, 1)?.memo).toBe('新しいメモ')
    })

    it('AC28/AC15: after a failed save, updateMemo changes the memo in memory without trying to write', () => {
      const { result } = renderHook(() => useSpotsData())
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementationOnce(throwQuotaExceededError)
      act(() => result.current.toggleDone(1))
      const setItemCallsAfterFailure = setItemSpy.mock.calls.length

      act(() => result.current.updateMemo(2, '新しいメモ'))

      expect(setItemSpy).toHaveBeenCalledTimes(setItemCallsAfterFailure)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(findSpot(result.current.data, 2)?.memo).toBe('新しいメモ')
      expect(findSpot(result.current.data, 1)?.done).toBe(true)
      expect(result.current.persistent).toBe(false)
    })
  })

  describe('AC22: refreshing the view', () => {
    it("AC22: a storage event for 'drive-spots:v1' refreshes data with what another tab saved", () => {
      const { result } = renderHook(() => useSpotsData())
      const otherTabData = createOtherTabData()
      writeSavedData(otherTabData)

      dispatchStorageEvent(STORAGE_KEY)

      expect(result.current.data).toEqual(otherTabData)
      expect(result.current.ready).toBe(true)
      expect(result.current.persistent).toBe(true)
    })

    it('AC22: a storage event with key null (storage cleared or rewritten elsewhere) refreshes data', () => {
      const { result } = renderHook(() => useSpotsData())
      const otherTabData = createOtherTabData()
      writeSavedData(otherTabData)

      dispatchStorageEvent(null)

      expect(result.current.data).toEqual(otherTabData)
    })

    it('AC22: storage events for other keys do not refresh data', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      dispatchStorageEvent('some-other-app')
      dispatchStorageEvent(BACKUP_KEY)

      expect(result.current.data).toEqual(createSeedData())
    })

    it('AC22: pageshow with persisted true (restored by back/forward) refreshes data', () => {
      const { result } = renderHook(() => useSpotsData())
      const otherTabData = createOtherTabData()
      writeSavedData(otherTabData)

      dispatchPageShow(true)

      expect(result.current.data).toEqual(otherTabData)
    })

    it('AC22: pageshow with persisted false (a normal load) does not refresh data', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      dispatchPageShow(false)

      expect(result.current.data).toEqual(createSeedData())
    })

    it('AC22: refreshing does not write anything', () => {
      const { result } = renderHook(() => useSpotsData())
      const otherTabData = createOtherTabData()
      writeSavedData(otherTabData)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      dispatchStorageEvent(STORAGE_KEY)
      dispatchPageShow(true)

      expect(result.current.data).toEqual(otherTabData)
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('AC22/AC15: a refresh after a failed save shows the latest data but keeps persistent false', () => {
      const { result } = renderHook(() => useSpotsData())
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(throwQuotaExceededError)
      act(() => result.current.toggleDone(1))
      setItemSpy.mockRestore()
      const otherTabData = createOtherTabData()
      writeSavedData(otherTabData)

      dispatchStorageEvent(STORAGE_KEY)

      expect(result.current.data).toEqual(otherTabData)
      expect(result.current.persistent).toBe(false)
    })

    it('AC22: removes its storage and pageshow listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { unmount } = renderHook(() => useSpotsData())

      unmount()

      for (const eventType of ['storage', 'pageshow']) {
        const addedListeners = addEventListenerSpy.mock.calls
          .filter(([type]) => type === eventType)
          .map(([, listener]) => listener)
        const removedListeners = removeEventListenerSpy.mock.calls
          .filter(([type]) => type === eventType)
          .map(([, listener]) => listener)
        expect(addedListeners, `a '${eventType}' listener is added`).not.toHaveLength(0)
        for (const listener of addedListeners) {
          expect(removedListeners, `the '${eventType}' listener is removed`).toContain(listener)
        }
      }
    })

    it('AC22: after unmount, storage and pageshow events no longer read localStorage', () => {
      const { unmount } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())
      unmount()
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')

      dispatchStorageEvent(STORAGE_KEY)
      dispatchPageShow(true)

      expect(getItemSpy).not.toHaveBeenCalled()
    })
  })

  // ---------- AC30, AC36, AC38, AC39 ----------

  describe('newerVersion and hasSavedData after loading (AC30, AC38, AC39)', () => {
    it('AC39: with nothing saved, newerVersion and hasSavedData are false', () => {
      const { result } = renderHook(() => useSpotsData())

      expect(result.current.newerVersion).toBe(false)
      expect(result.current.hasSavedData).toBe(false)
      expect(result.current.persistent).toBe(true)
    })

    it('AC38: with valid saved data, hasSavedData is true', () => {
      writeSavedData(createOtherTabData())

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.hasSavedData).toBe(true)
      expect(result.current.newerVersion).toBe(false)
    })

    it('AC38: a saved empty list is saved data too', () => {
      writeSavedData({ version: 1, nextId: 20, spots: [] })

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.hasSavedData).toBe(true)
    })

    it('AC39: corrupt data (backed up) is not saved data', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.hasSavedData).toBe(false)
      expect(result.current.newerVersion).toBe(false)
      expect(result.current.persistent).toBe(true)
    })

    it('AC15/AC39: hasSavedData is false when getItem throws', () => {
      writeSavedData(createOtherTabData())
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.hasSavedData).toBe(false)
      expect(result.current.newerVersion).toBe(false)
    })

    it('AC30: data saved by a newer version loads as the seed with persistent false and newerVersion true, writing nothing', () => {
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.ready).toBe(true)
      expect(result.current.data).toEqual(createSeedData())
      expect(result.current.persistent).toBe(false)
      expect(result.current.newerVersion).toBe(true)
      expect(result.current.hasSavedData).toBe(false)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })

    it("AC30/AC14: version '2' as a string is corrupt, not newer", () => {
      const corruptRaw = JSON.stringify({ ...createSeedData(), version: '2' })
      window.localStorage.setItem(STORAGE_KEY, corruptRaw)

      const { result } = renderHook(() => useSpotsData())

      expect(result.current.newerVersion).toBe(false)
      expect(result.current.persistent).toBe(true)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBe(corruptRaw)
    })

    it.each(SPOT_ACTIONS)('AC30: after loading newer data, %s changes memory only and never writes', (_name, runAction) => {
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { result } = renderHook(() => useSpotsData())
      const dataBefore = result.current.data

      act(() => runAction(result.current))

      expect(result.current.data).not.toEqual(dataBefore)
      expect(result.current.persistent).toBe(false)
      expect(result.current.newerVersion).toBe(true)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })
  })

  describe('AC30: newer data found when re-reading right before a write', () => {
    it.each(SPOT_ACTIONS)(
      'AC30: %s writes nothing, keeps the change in memory, and turns persistent off and newerVersion on',
      (_name, runAction) => {
        const { result } = renderHook(() => useSpotsData())
        window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
        const dataBefore = result.current.data

        act(() => runAction(result.current))

        expect(result.current.data).not.toEqual(dataBefore)
        expect(result.current.persistent).toBe(false)
        expect(result.current.newerVersion).toBe(true)
        expect(setItemSpy).not.toHaveBeenCalled()
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
        expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
      },
    )

    it('AC30: toggleDone applies to the data shown here (the newer data is not read into this screen)', () => {
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)

      act(() => result.current.toggleDone(1))

      const expectedSpots = createSeedData().spots.map((spot) => (spot.id === 1 ? { ...spot, done: true } : spot))
      expect(result.current.data).toEqual({ ...createSeedData(), spots: expectedSpots })
    })

    it('AC30: newerVersion and persistent false stay, and nothing is written later, even once storage holds version 1 data again', () => {
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      act(() => result.current.toggleDone(1))
      writeSavedData(createOtherTabData())
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      act(() => result.current.add(NEW_SPOT_INPUT))
      act(() => result.current.updateMemo(2, '新しいメモ'))

      expect(result.current.newerVersion).toBe(true)
      expect(result.current.persistent).toBe(false)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(readSavedData()).toEqual(createOtherTabData())
    })

    it('AC30: a write that succeeded before stays saved (only later writes stop)', () => {
      const { result } = renderHook(() => useSpotsData())
      act(() => result.current.toggleDone(1))
      const savedBefore = readSavedData()
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)

      act(() => result.current.toggleDone(2))

      expect(savedBefore).not.toBeNull()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(result.current.newerVersion).toBe(true)
    })
  })

  describe('AC30: refreshing finds newer data', () => {
    it("AC30: a storage event for 'drive-spots:v1' turns persistent off and newerVersion on, keeps the data shown and writes nothing", () => {
      const { result } = renderHook(() => useSpotsData())
      act(() => result.current.toggleDone(1))
      const dataShown = result.current.data
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      dispatchStorageEvent(STORAGE_KEY)

      expect(result.current.persistent).toBe(false)
      expect(result.current.newerVersion).toBe(true)
      expect(result.current.data).toEqual(dataShown)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
    })

    it('AC30: a storage event with key null does the same', () => {
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)

      dispatchStorageEvent(null)

      expect(result.current.persistent).toBe(false)
      expect(result.current.newerVersion).toBe(true)
      expect(result.current.data).toEqual(createSeedData())
    })

    it('AC30: pageshow with persisted true does the same', () => {
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      dispatchPageShow(true)

      expect(result.current.persistent).toBe(false)
      expect(result.current.newerVersion).toBe(true)
      expect(result.current.data).toEqual(createSeedData())
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('AC30: storage events for other keys and a normal pageshow do not look at it', () => {
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)

      dispatchStorageEvent('some-other-app')
      dispatchPageShow(false)

      expect(result.current.persistent).toBe(true)
      expect(result.current.newerVersion).toBe(false)
    })

    it('AC30: after a refresh found newer data, actions change memory only and never write', () => {
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      dispatchStorageEvent(STORAGE_KEY)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      act(() => result.current.toggleDone(1))
      act(() => result.current.add(NEW_SPOT_INPUT))

      expect(findSpot(result.current.data, 1)?.done).toBe(true)
      expect(result.current.data.spots[0]).toMatchObject({ name: '大観山' })
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(NEWER_VERSION_RAW)
    })

    it('AC30/AC22: a later refresh that finds valid data shows it, but newerVersion and persistent false stay', () => {
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, NEWER_VERSION_RAW)
      dispatchStorageEvent(STORAGE_KEY)
      const otherTabData = createOtherTabData()
      writeSavedData(otherTabData)

      dispatchStorageEvent(STORAGE_KEY)

      expect(result.current.data).toEqual(otherTabData)
      expect(result.current.newerVersion).toBe(true)
      expect(result.current.persistent).toBe(false)
    })
  })

  describe('hasSavedData over time (AC38, AC39)', () => {
    it('AC39: becomes true after the first successful save', () => {
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.toggleDone(1))

      expect(result.current.hasSavedData).toBe(true)
    })

    it('AC39: stays false when the save fails', () => {
      const { result } = renderHook(() => useSpotsData())
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      act(() => result.current.toggleDone(1))

      expect(result.current.hasSavedData).toBe(false)
    })

    it('AC39: stays false while storage cannot be read', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.toggleDone(1))

      expect(result.current.hasSavedData).toBe(false)
    })

    it('AC39: corrupt data becomes saved data once the first save backed it up and wrote', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.toggleDone(1))

      expect(result.current.hasSavedData).toBe(true)
      expect(window.localStorage.getItem(BACKUP_KEY)).toBe('{broken')
    })

    it('AC38/AC22: a refresh that finds valid data sets it to true', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      dispatchStorageEvent(STORAGE_KEY)

      expect(result.current.hasSavedData).toBe(true)
    })

    it('AC38: stays true once true (a later refresh that finds nothing does not reset it)', () => {
      writeSavedData(createOtherTabData())
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.clear()

      dispatchStorageEvent(null)

      expect(result.current.hasSavedData).toBe(true)
    })
  })

  describe('replaceAll (AC36)', () => {
    it('AC36: replaces every spot and nextId and saves exactly that', () => {
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.replaceAll(structuredClone(IMPORTED_DATA)))

      expect(result.current.data).toEqual(IMPORTED_DATA)
      expect(readSavedData()).toEqual(IMPORTED_DATA)
      expect(result.current.persistent).toBe(true)
      expect(result.current.hasSavedData).toBe(true)
    })

    it('AC36: the file wins over what another tab saved meanwhile (nothing is merged)', () => {
      const { result } = renderHook(() => useSpotsData())
      writeSavedData(createOtherTabData())

      act(() => result.current.replaceAll(structuredClone(IMPORTED_DATA)))

      expect(result.current.data).toEqual(IMPORTED_DATA)
      expect(readSavedData()).toEqual(IMPORTED_DATA)
      expect(findSpot(readSavedData(), OTHER_TAB_SPOT.id)).toBeUndefined()
    })

    it('AC36/AC16: a spot added after the import takes the imported nextId', () => {
      const { result } = renderHook(() => useSpotsData())
      act(() => result.current.replaceAll(structuredClone(IMPORTED_DATA)))

      act(() => result.current.add(NEW_SPOT_INPUT))

      expect(result.current.data.spots[0]).toMatchObject({ id: IMPORTED_DATA.nextId, name: '大観山' })
      expect(readSavedData()?.nextId).toBe(IMPORTED_DATA.nextId + 1)
    })

    it('AC36/AC14: over corrupt saved data, backs the corrupt string up before writing the imported data', () => {
      const corruptRaw = '{"version":1,"nextId":'
      const { result } = renderHook(() => useSpotsData())
      window.localStorage.setItem(STORAGE_KEY, corruptRaw)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      act(() => result.current.replaceAll(structuredClone(IMPORTED_DATA)))

      expect(setItemSpy.mock.calls.map(([key]) => key)).toEqual([BACKUP_KEY, STORAGE_KEY])
      expect(window.localStorage.getItem(BACKUP_KEY)).toBe(corruptRaw)
      expect(readSavedData()).toEqual(IMPORTED_DATA)
    })

    it('AC36/AC14: when corrupt data could not be backed up, the import changes memory only and the original stays', () => {
      window.localStorage.setItem(STORAGE_KEY, '{broken')
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(throwQuotaExceededError)
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.replaceAll(structuredClone(IMPORTED_DATA)))

      expect(result.current.data).toEqual(IMPORTED_DATA)
      expect(result.current.persistent).toBe(false)
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{broken')
    })

    it('AC36/AC15: when getItem throws, the import changes memory only and setItem is never called', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const { result } = renderHook(() => useSpotsData())

      act(() => result.current.replaceAll(structuredClone(IMPORTED_DATA)))

      expect(result.current.data).toEqual(IMPORTED_DATA)
      expect(result.current.persistent).toBe(false)
      expect(result.current.hasSavedData).toBe(false)
      expect(setItemSpy).not.toHaveBeenCalled()
    })

    it('AC36/AC15: a failed save turns persistent off and keeps the imported data in memory', () => {
      const { result } = renderHook(() => useSpotsData())
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      act(() => result.current.replaceAll(structuredClone(IMPORTED_DATA)))

      expect(result.current.data).toEqual(IMPORTED_DATA)
      expect(result.current.persistent).toBe(false)
      expect(result.current.hasSavedData).toBe(false)
    })

    it('AC36: replaceAll called before the saved data has been read does nothing', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const readyWhenActionRan: boolean[] = []

      // A layout effect runs before the hook's own (passive) load effect, i.e. while ready is false.
      const { result } = renderHook(() => {
        const spotsData = useSpotsData()
        const actionRanRef = useRef(false)
        useLayoutEffect(() => {
          if (actionRanRef.current) return
          actionRanRef.current = true
          readyWhenActionRan.push(spotsData.ready)
          spotsData.replaceAll(structuredClone(IMPORTED_DATA))
        })
        return spotsData
      })

      expect(readyWhenActionRan).toEqual([false])
      expect(result.current.data).toEqual(createSeedData())
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })
})
