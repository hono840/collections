'use client'

import { useState } from 'react'
import { SpotDetailScreen } from '@/components/organisms/SpotDetailScreen'
import { SpotFormScreen } from '@/components/organisms/SpotFormScreen'
import { SpotListScreen } from '@/components/organisms/SpotListScreen'
import { AppShell } from '@/components/templates/AppShell'
import { ALL_CATEGORIES } from '@/lib/spots/types'
import type { CategoryFilter, SpotInput, Tab } from '@/lib/spots/types'
import { useSpotsData } from '@/lib/spots/useSpotsData'

type Screen = 'list' | 'detail' | 'add'

/**
 * The whole app (design Main.dc.html `class Component`). Owns which screen is shown, the list's tab
 * and category, and the selected spot; the data lives in useSpotsData. Only the current screen is
 * rendered, and nothing until the saved data has been read.
 */
export function DriveSpotsApp() {
  const { ready, data, persistent, add, toggleDone, remove, updateMemo } = useSpotsData()
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

  if (!ready) return <AppShell />

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

  return (
    <AppShell>
      <SpotListScreen
        spots={data.spots}
        tab={tab}
        category={category}
        persistent={persistent}
        onTabChange={setTab}
        onCategoryChange={setCategory}
        onOpenSpot={openSpot}
        onAddSpot={openAddForm}
        focusOnMount={hasNavigated}
        focusSpotId={returnFocusSpotId}
      />
    </AppShell>
  )
}
