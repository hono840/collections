'use client'

import { useState } from 'react'
import { BackupScreen } from '@/components/organisms/BackupScreen'
import { SpotDetailScreen } from '@/components/organisms/SpotDetailScreen'
import { SpotFormScreen } from '@/components/organisms/SpotFormScreen'
import { SpotListScreen } from '@/components/organisms/SpotListScreen'
import { AppShell } from '@/components/templates/AppShell'
import { BACKUP_FILE_MIME_TYPE, backupFileName, backupReminder, createBackupFileContent } from '@/lib/spots/backup'
import { ALL_CATEGORIES } from '@/lib/spots/types'
import type { CategoryFilter, SaveNotice, SpotInput, Tab } from '@/lib/spots/types'
import { useLastBackup } from '@/lib/spots/useLastBackup'
import { useSpotsData } from '@/lib/spots/useSpotsData'
import { downloadTextFile } from '@/lib/utils/download'

type Screen = 'list' | 'detail' | 'add' | 'backup'

/**
 * The whole app (design Main.dc.html `class Component`). Owns which screen is shown, the list's tab
 * and category, and the selected spot; the data lives in useSpotsData and the last export time in
 * useLastBackup. Only the current screen is rendered, and nothing until the saved data has been read.
 */
export function DriveSpotsApp() {
  const { ready, data, persistent, newerVersion, hasSavedData, add, toggleDone, remove, updateMemo, replaceAll } =
    useSpotsData()
  const { lastBackupAt, recordBackup } = useLastBackup()
  const [screen, setScreen] = useState<Screen>('list')
  const [tab, setTab] = useState<Tab>('want')
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORIES)
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null)
  // Focus moves to the new screen only after the user has navigated (never on the first load).
  const [hasNavigated, setHasNavigated] = useState(false)
  // The card that gets focus back when returning from its detail screen.
  const [returnFocusSpotId, setReturnFocusSpotId] = useState<number | null>(null)

  function showScreen(nextScreen: Screen) {
    setScreen(nextScreen)
    setHasNavigated(true)
  }

  function openSpot(id: number) {
    setSelectedSpotId(id)
    showScreen('detail')
  }

  // Design `goList`: tab and category stay as they were (AC6).
  function backFromDetail() {
    setReturnFocusSpotId(selectedSpotId)
    showScreen('list')
  }

  function openAddForm() {
    setReturnFocusSpotId(null)
    showScreen('add')
  }

  function cancelAddForm() {
    showScreen('list')
  }

  // AC12: the new spot is first under 行きたい / すべて.
  function saveSpot(input: SpotInput) {
    add(input)
    setTab('want')
    setCategory(ALL_CATEGORIES)
    showScreen('list')
  }

  function toggleSelectedDone() {
    if (selectedSpotId !== null) toggleDone(selectedSpotId)
  }

  // AC27: if another tab deleted the spot meanwhile, nothing comes back and the check below shows
  // the list instead of the detail.
  function updateSelectedMemo(memo: string) {
    if (selectedSpotId !== null) updateMemo(selectedSpotId, memo)
  }

  function removeSelected() {
    if (selectedSpotId !== null) remove(selectedSpotId)
    setSelectedSpotId(null)
    setReturnFocusSpotId(null)
    showScreen('list')
  }

  // AC31: coming back from the backup screen focuses the list heading, not a card seen earlier.
  function openBackup() {
    setReturnFocusSpotId(null)
    showScreen('backup')
  }

  function backFromBackup() {
    showScreen('list')
  }

  // AC32/AC33: while this device cannot save (AC15) the data on screen is still downloaded, but the
  // time is only recorded while saving works, since the file then holds on-screen data, not the saved
  // data. With a newer version's data (AC30) nothing is exported at all; the backup screen also
  // disables the button, this is the second line of defence.
  function exportBackup() {
    if (newerVersion) return
    const exportedAt = new Date()
    downloadTextFile(backupFileName(exportedAt), createBackupFileContent(data, exportedAt), BACKUP_FILE_MIME_TYPE)
    if (persistent) recordBackup(exportedAt)
  }

  if (!ready) return <AppShell />

  // AC30 replaces the AC15 notice, on the list and on the backup screen (AC32, AC36).
  const saveNotice: SaveNotice = newerVersion ? 'newer-version' : persistent ? 'none' : 'unavailable'

  // The detail always shows the current data, so a change saved in another tab shows up here too
  // (AC22). If that tab deleted the spot, the list is shown instead.
  const selectedSpot = data.spots.find((spot) => spot.id === selectedSpotId)

  if (screen === 'detail' && selectedSpot === undefined) {
    // Leave the detail for good, so the same id coming back later cannot reopen it on its own.
    // Setting state while rendering is React's pattern for adjusting state to new data; it re-renders
    // right away without committing this pass. The list then focuses its heading.
    setScreen('list')
    setSelectedSpotId(null)
    setReturnFocusSpotId(null)
  }

  if (screen === 'detail' && selectedSpot !== undefined) {
    return (
      <AppShell>
        <SpotDetailScreen
          key={selectedSpot.id}
          spot={selectedSpot}
          onBack={backFromDetail}
          onToggleDone={toggleSelectedDone}
          onRemove={removeSelected}
          onUpdateMemo={updateSelectedMemo}
          focusOnMount={hasNavigated}
        />
      </AppShell>
    )
  }

  if (screen === 'add') {
    return (
      <AppShell>
        <SpotFormScreen onCancel={cancelAddForm} onSave={saveSpot} focusOnMount={hasNavigated} />
      </AppShell>
    )
  }

  if (screen === 'backup') {
    // AC36: replaceAll saves through the same path as every other change, so AC14, AC15 and AC30 apply.
    return (
      <AppShell>
        <BackupScreen
          spots={data.spots}
          lastBackupAt={lastBackupAt}
          saveNotice={saveNotice}
          onBack={backFromBackup}
          onExport={exportBackup}
          onReplace={replaceAll}
          focusOnMount={hasNavigated}
        />
      </AppShell>
    )
  }

  // The restore hint only shows while saving works and no valid data is saved yet (AC39); the
  // reminder only once data is saved (AC38). The list renders only on the client (after `ready`), so
  // reading the clock here cannot cause a hydration mismatch.
  return (
    <AppShell>
      <SpotListScreen
        spots={data.spots}
        tab={tab}
        category={category}
        saveNotice={saveNotice}
        backupReminder={backupReminder(hasSavedData, lastBackupAt, new Date())}
        showRestoreHint={saveNotice === 'none' && !hasSavedData}
        onTabChange={setTab}
        onCategoryChange={setCategory}
        onOpenSpot={openSpot}
        onAddSpot={openAddForm}
        onOpenBackup={openBackup}
        focusOnMount={hasNavigated}
        focusSpotId={returnFocusSpotId}
      />
    </AppShell>
  )
}
