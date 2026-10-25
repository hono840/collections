'use client'

import { useEffect, useRef, useState } from 'react'
import { addSpot, removeSpot, toggleDone as toggleSpotDone, updateMemo as updateSpotMemo } from './spots'
import { STORAGE_KEY, getBrowserStorage, loadSpotsData, parseSpotsData, updateSpotsData } from './storage'
import type { SpotInput, SpotsData } from './types'

type SpotsState = { ready: boolean; data: SpotsData; persistent: boolean }

// What the static HTML and the hydration render see. The screens wait for `ready`, so this empty
// list is never shown (no seed flash, no hydration mismatch with the saved data).
const NOT_LOADED_STATE: SpotsState = {
  ready: false,
  data: { version: 1, nextId: 1, spots: [] },
  persistent: true,
}

/**
 * Read-only look at what is saved now. null when storage cannot be read, nothing is saved or the
 * saved string is corrupt; a refresh then keeps what this screen shows (AC22).
 */
function readLatestSavedData(): SpotsData | null {
  const storage = getBrowserStorage()
  if (storage === null) return null
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw === null ? null : parseSpotsData(raw)
  } catch {
    return null
  }
}

/**
 * The spots and the actions on them.
 * - Every action goes through updateSpotsData, which re-reads the saved data right before writing
 *   so changes saved by another tab or a restored page are kept (AC13, AC22).
 * - Once `persistent` is false (storage unreadable, corrupt data that could not be backed up, or a
 *   failed save) it stays false and nothing is written again; changes live in memory only (AC14, AC15).
 * - A `storage` event for STORAGE_KEY (or null = cleared) and a `pageshow` restored from the
 *   back/forward cache refresh the view from storage, read-only (AC22).
 */
export function useSpotsData(): {
  ready: boolean
  data: SpotsData
  persistent: boolean
  add(input: SpotInput): void
  toggleDone(id: number): void
  remove(id: number): void
  updateMemo(id: number, memo: string): void
} {
  const [state, setState] = useState<SpotsState>(NOT_LOADED_STATE)
  // The newest state, so an action or refresh that runs before React re-renders builds on it.
  const latestStateRef = useRef<SpotsState>(NOT_LOADED_STATE)

  useEffect(() => {
    function showState(nextState: SpotsState) {
      latestStateRef.current = nextState
      setState(nextState)
    }

    // localStorage only exists in the browser, and reading it during the first render would make
    // the hydrated HTML differ from the static export, so it is read after mounting.
    showState({ ready: true, ...loadSpotsData(getBrowserStorage()) })

    // Only replaces the data with valid saved data: never the seed, never a write (AC22).
    function refreshFromStorage() {
      const latestData = readLatestSavedData()
      if (latestData === null) return
      showState({ ...latestStateRef.current, data: latestData })
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) refreshFromStorage()
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) refreshFromStorage()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  function commit(change: (data: SpotsData) => SpotsData) {
    const currentState = latestStateRef.current
    // Writing before the saved data has been read would overwrite it.
    if (!currentState.ready) return
    // While not persistent, storage is not even offered: data that could not be read or backed up
    // must not be overwritten (AC14, AC15).
    const storage = currentState.persistent ? getBrowserStorage() : null
    const result = updateSpotsData(storage, currentState.data, change)
    const nextState: SpotsState = {
      ready: true,
      data: result.data,
      persistent: currentState.persistent && result.saved,
    }
    latestStateRef.current = nextState
    setState(nextState)
  }

  return {
    ...state,
    add: (input) => commit((data) => addSpot(data, input)),
    toggleDone: (id) => commit((data) => toggleSpotDone(data, id)),
    remove: (id) => commit((data) => removeSpot(data, id)),
    // AC27: applied to the re-read data, so a spot another tab deleted stays deleted.
    updateMemo: (id, memo) => commit((data) => updateSpotMemo(data, id, memo)),
  }
}
