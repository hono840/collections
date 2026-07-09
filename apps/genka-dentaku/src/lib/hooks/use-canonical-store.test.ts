import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { STORAGE_KEY } from '@/lib/constants/storage-keys'
import { DEFAULT_STATE } from '@/lib/storage/canonical-store'
import { useCanonicalStore } from './use-canonical-store'

describe('useCanonicalStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts from DEFAULT_STATE and reports mounted after hydration', () => {
    const { result } = renderHook(() => useCanonicalStore())
    expect(result.current.state).toEqual(DEFAULT_STATE)
    expect(result.current.mounted).toBe(true)
  })

  it('persists updates through to localStorage and reflects them', () => {
    const { result } = renderHook(() => useCanonicalStore())

    act(() => {
      result.current.setState((prev) => ({
        ...prev,
        meta: { ...prev.meta, sampleSeeded: true },
      }))
    })

    expect(result.current.state.meta.sampleSeeded).toBe(true)
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
    expect(stored.meta.sampleSeeded).toBe(true)
  })

  it('reads back an already-persisted state on mount', () => {
    const seeded = { ...DEFAULT_STATE, meta: { onboardingDone: true, sampleSeeded: true } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))

    const { result } = renderHook(() => useCanonicalStore())
    expect(result.current.state.meta).toEqual({ onboardingDone: true, sampleSeeded: true })
  })

  it('reflects a cross-tab storage event', () => {
    const { result } = renderHook(() => useCanonicalStore())
    const updated = { ...DEFAULT_STATE, meta: { onboardingDone: true, sampleSeeded: false } }

    act(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    })

    expect(result.current.state.meta.onboardingDone).toBe(true)
  })
})
