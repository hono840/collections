'use client'

import { useEffect, useRef, useState } from 'react'
import {
  addSpot,
  removeSpot,
  toggleDone as toggleSpotDone,
  updateMemo as updateSpotMemo,
  updateSpot as updateSpotFields,
} from './spots'
import { STORAGE_KEY, getBrowserStorage, loadSpotsData, readSavedSpots, updateSpotsData } from './storage'
import { SPOTS_DATA_VERSION } from './types'
import type { SpotInput, SpotsData } from './types'

type SpotsState = {
  ready: boolean
  data: SpotsData
  persistent: boolean
  newerVersion: boolean
  hasSavedData: boolean
}

// What the static HTML and the hydration render see. The screens wait for `ready`, so this empty
// list is never shown (no seed flash, no hydration mismatch with the saved data).
const NOT_LOADED_STATE: SpotsState = {
  ready: false,
  data: { version: SPOTS_DATA_VERSION, nextId: 1, spots: [] },
  persistent: true,
  newerVersion: false,
  hasSavedData: false,
}

/**
 * The spots and the actions on them.
 * - Every action goes through updateSpotsData, which re-reads the saved data right before writing
 *   so changes saved by another tab or a restored page are kept (AC13, AC22).
 * - Once `persistent` is false (storage unreadable, corrupt data that could not be backed up, a
 *   failed save, or data from a newer version) it stays false and nothing is written again; changes
 *   live in memory only (AC14, AC15, AC30).
 * - `newerVersion` turns true when loading, a write or a refresh finds data saved by a newer version
 *   of the app, and stays true: this page then never writes (AC30).
 * - `hasSavedData` is true once valid data is known to be saved on this device (loaded, saved or
 *   refreshed) and stays true (AC38, AC39).
 * - A `storage` event for STORAGE_KEY (or null = cleared) and a `pageshow` restored from the
 *   back/forward cache refresh the view from storage, read-only (AC22, AC30).
 */
export function useSpotsData(): {
  ready: boolean
  data: SpotsData
  persistent: boolean
  newerVersion: boolean
  hasSavedData: boolean
  add(input: SpotInput): void
  toggleDone(id: number): void
  remove(id: number): void
  updateMemo(id: number, memo: string): void
  updateSpot(id: number, input: SpotInput): void
  replaceAll(data: SpotsData): void
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

    // Read-only (AC22, AC30): valid saved data replaces what is shown; newer data only turns saving
    // off; nothing saved, unreadable or corrupt storage changes nothing (never the seed, never a
    // write, not even the corrupt-data backup).
    function refreshFromStorage() {
      const savedSpots = readSavedSpots(getBrowserStorage())
      if (savedSpots.kind === 'valid') {
        showState({ ...latestStateRef.current, data: savedSpots.data, hasSavedData: true })
      } else if (savedSpots.kind === 'newer') {
        showState({ ...latestStateRef.current, persistent: false, newerVersion: true })
      }
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
    // While not persistent, or once a newer version's data was seen, storage is not even offered:
    // data that could not be read, backed up or understood must not be overwritten (AC14, AC15, AC30).
    const canWrite = currentState.persistent && !currentState.newerVersion
    const storage = canWrite ? getBrowserStorage() : null
    const result = updateSpotsData(storage, currentState.data, change)
    const nextState: SpotsState = {
      ready: true,
      data: result.data,
      persistent: currentState.persistent && result.saved,
      newerVersion: currentState.newerVersion || result.newerVersion,
      hasSavedData: currentState.hasSavedData || result.saved,
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
    // AC45: the 7 fields go onto the re-read data, so 行った and spots from another tab are kept and a
    // spot another tab deleted stays deleted.
    updateSpot: (id, input) => commit((data) => updateSpotFields(data, id, input)),
    // AC36: the file's data as it is (nextId included); what another tab saved is replaced, not merged.
    replaceAll: (data) => commit(() => data),
  }
}
