'use client'

import { useEffect, useState } from 'react'
import { getBrowserStorage, readLastBackupAt, writeLastBackupAt } from './storage'

/**
 * When the data was last exported to a file (AC33).
 * - Read after mounting, like useSpotsData, so the static HTML and the hydration render agree.
 *   Reading never writes.
 * - recordBackup tries to store the time; the screen shows it even when that write fails, and the
 *   export itself is never undone by it.
 */
export function useLastBackup(): { lastBackupAt: Date | null; recordBackup(at: Date): void } {
  const [lastBackupAt, setLastBackupAt] = useState<Date | null>(null)

  useEffect(() => {
    // localStorage only exists in the browser, and the first render must match the static HTML
    // (null), so the saved time can only be read here, once, after mounting (see useSpotsData).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read after mount, by design
    setLastBackupAt(readLastBackupAt(getBrowserStorage()))
  }, [])

  function recordBackup(at: Date) {
    writeLastBackupAt(getBrowserStorage(), at)
    setLastBackupAt(at)
  }

  return { lastBackupAt, recordBackup }
}
