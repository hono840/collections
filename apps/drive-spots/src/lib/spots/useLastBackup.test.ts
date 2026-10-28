import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_KEY, LAST_BACKUP_KEY, STORAGE_KEY } from './storage'
import { useLastBackup } from './useLastBackup'

// useLastBackup (spec AC33, docs/product/architecture.md) against jsdom's real localStorage,
// cleared around every test.

const SAVED_AT = new Date('2026-10-20T01:23:45.678Z')
const EXPORTED_AT = new Date('2026-10-25T03:00:00.000Z')

function throwSecurityError(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

function throwQuotaExceededError(): never {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('useLastBackup', () => {
  describe('reading', () => {
    it('AC33: is null on the first render and the saved time after mounting', () => {
      window.localStorage.setItem(LAST_BACKUP_KEY, SAVED_AT.toISOString())
      const lastBackupHistory: (Date | null)[] = []

      const { result } = renderHook(() => {
        const lastBackup = useLastBackup()
        lastBackupHistory.push(lastBackup.lastBackupAt)
        return lastBackup
      })

      expect(lastBackupHistory[0]).toBeNull()
      expect(result.current.lastBackupAt).toBeInstanceOf(Date)
      expect(result.current.lastBackupAt?.toISOString()).toBe(SAVED_AT.toISOString())
    })

    it('AC33: is null when it was never exported', () => {
      const { result } = renderHook(() => useLastBackup())

      expect(result.current.lastBackupAt).toBeNull()
    })

    it('AC33: is null when the saved string is not a time', () => {
      window.localStorage.setItem(LAST_BACKUP_KEY, 'not a date')

      const { result } = renderHook(() => useLastBackup())

      expect(result.current.lastBackupAt).toBeNull()
    })

    it('AC33/AC15: is null (and does not throw) when getItem throws', () => {
      window.localStorage.setItem(LAST_BACKUP_KEY, SAVED_AT.toISOString())
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(throwSecurityError)

      const { result } = renderHook(() => useLastBackup())

      expect(result.current.lastBackupAt).toBeNull()
    })

    it('AC33/AC15: is null when reading window.localStorage itself throws', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(throwSecurityError)

      const { result } = renderHook(() => useLastBackup())

      expect(result.current.lastBackupAt).toBeNull()
    })

    it('AC33: reading writes nothing', () => {
      window.localStorage.setItem(LAST_BACKUP_KEY, SAVED_AT.toISOString())
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      renderHook(() => useLastBackup())

      expect(setItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('recordBackup', () => {
    it("AC33: writes the time under 'drive-spots:v1:last-backup' and shows it", () => {
      const { result } = renderHook(() => useLastBackup())

      act(() => result.current.recordBackup(EXPORTED_AT))

      expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBe(EXPORTED_AT.toISOString())
      expect(result.current.lastBackupAt?.getTime()).toBe(EXPORTED_AT.getTime())
    })

    it('AC33: replaces an older time', () => {
      window.localStorage.setItem(LAST_BACKUP_KEY, SAVED_AT.toISOString())
      const { result } = renderHook(() => useLastBackup())

      act(() => result.current.recordBackup(EXPORTED_AT))

      expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBe(EXPORTED_AT.toISOString())
      expect(result.current.lastBackupAt?.getTime()).toBe(EXPORTED_AT.getTime())
    })

    it('AC33: writes only the last-backup key (the spots and the corrupt-data backup are untouched)', () => {
      const { result } = renderHook(() => useLastBackup())

      act(() => result.current.recordBackup(EXPORTED_AT))

      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull()
      expect(window.localStorage.length).toBe(1)
    })

    it('AC33: when the write fails, it does not throw and still shows the time', () => {
      const { result } = renderHook(() => useLastBackup())
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(throwQuotaExceededError)

      expect(() => {
        act(() => result.current.recordBackup(EXPORTED_AT))
      }).not.toThrow()

      expect(result.current.lastBackupAt?.getTime()).toBe(EXPORTED_AT.getTime())
      expect(window.localStorage.getItem(LAST_BACKUP_KEY)).toBeNull()
    })

    it('AC33/AC15: when localStorage cannot be used at all, it still shows the time', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(throwSecurityError)
      const { result } = renderHook(() => useLastBackup())

      act(() => result.current.recordBackup(EXPORTED_AT))

      expect(result.current.lastBackupAt?.getTime()).toBe(EXPORTED_AT.getTime())
    })

    it('AC33: a hook mounted later reads what recordBackup wrote', () => {
      const { result, unmount } = renderHook(() => useLastBackup())
      act(() => result.current.recordBackup(EXPORTED_AT))
      unmount()

      const { result: resultAfterReload } = renderHook(() => useLastBackup())

      expect(resultAfterReload.current.lastBackupAt?.getTime()).toBe(EXPORTED_AT.getTime())
    })
  })
})
