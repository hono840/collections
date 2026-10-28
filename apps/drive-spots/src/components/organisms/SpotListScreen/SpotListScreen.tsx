'use client'

import { useEffect, useId, useRef } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { CategoryChips } from '@/components/molecules/CategoryChips'
import { EmptyState } from '@/components/molecules/EmptyState'
import { SpotCard } from '@/components/molecules/SpotCard'
import { TabSwitch } from '@/components/molecules/TabSwitch'
import type { BackupReminder } from '@/lib/spots/backup'
import { countByTab, filterSpots } from '@/lib/spots/spots'
import { ALL_CATEGORIES, CATEGORIES, CATEGORY_MARKS, SAVE_NOTICE_TEXTS } from '@/lib/spots/types'
import type { CategoryFilter, SaveNotice, Spot, Tab } from '@/lib/spots/types'

const CATEGORY_FILTERS: readonly CategoryFilter[] = [ALL_CATEGORIES, ...CATEGORIES]
const RESTORE_HINT = '前に使っていたデータは「バックアップ」から読み込めます'
// Every name starts with the visible text バックアップ (WCAG 2.5.3, AC38).
const BACKUP_BUTTON_LABELS: Record<BackupReminder, string> = {
  none: 'バックアップ',
  never: 'バックアップ（まだしていません）',
  stale: 'バックアップ（30日以上していません）',
}

type SpotListScreenProps = {
  /** Every spot; the screen filters by tab and category itself. */
  spots: Spot[]
  tab: Tab
  category: CategoryFilter
  /** Which save notice to show above the list, if any (AC15, AC30). */
  saveNotice: SaveNotice
  /** 'never' / 'stale' mark the backup button and change its name (AC38). */
  backupReminder: BackupReminder
  /** Shows the hint that old data can be imported from バックアップ (AC39). */
  showRestoreHint: boolean
  onTabChange: (tab: Tab) => void
  onCategoryChange: (category: CategoryFilter) => void
  onOpenSpot: (id: number) => void
  onAddSpot: () => void
  onOpenBackup: () => void
  /** Move focus here when the screen appears after a screen change (not on the first load). */
  focusOnMount?: boolean
  /** With focusOnMount: focus this spot's card if it is visible (coming back from its detail), else the heading. */
  focusSpotId?: number | null
}

/**
 * 一覧: heading with the backup button, tabs, category chips, a save notice or the restore hint,
 * cards (or the empty state) and the add button.
 */
export function SpotListScreen({
  spots,
  tab,
  category,
  saveNotice,
  backupReminder,
  showRestoreHint,
  onTabChange,
  onCategoryChange,
  onOpenSpot,
  onAddSpot,
  onOpenBackup,
  focusOnMount = false,
  focusSpotId = null,
}: SpotListScreenProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const cardElements = useRef(new Map<number, HTMLButtonElement>())
  const counts = countByTab(spots)
  const visibleSpots = filterSpots(spots, tab, category)

  useEffect(() => {
    if (!focusOnMount) return
    const card = focusSpotId === null ? undefined : cardElements.current.get(focusSpotId)
    // Focusing the card also scrolls it back into view.
    ;(card ?? headingRef.current)?.focus()
  }, [focusOnMount, focusSpotId])

  return (
    <section aria-labelledby={headingId} className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-4 px-5 pb-3.5 pt-safe-list">
        <div className="flex flex-col gap-0.5">
          <p className="font-display text-14 font-semibold tracking-eyebrow text-accent">DRIVE SPOTS</p>
          {/* On narrow phones the button wraps to the right of the next line; the heading never wraps. */}
          <div className="flex flex-wrap items-center gap-x-1">
            <h1
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="text-26 font-bold tracking-title focus:outline-none"
            >
              ドライブスポット帳
            </h1>
            {/* -my-1 keeps the 44px button from moving the heading; -mr-2 lines its text up with the tabs. */}
            <button
              type="button"
              onClick={() => onOpenBackup()}
              aria-label={BACKUP_BUTTON_LABELS[backupReminder]}
              className="relative -my-1 -mr-2 ml-auto h-11 shrink-0 bg-transparent px-2 text-13 font-medium text-ink-soft"
            >
              バックアップ
              {/* The mark is a shape, not only a color; border-4 survives forced-colors mode (AC38). */}
              {backupReminder === 'none' ? null : (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 top-3 size-2 rounded-full border-4 border-accent"
                />
              )}
            </button>
          </div>
        </div>
        <TabSwitch
          activeTab={tab}
          wantCount={counts.want}
          doneCount={counts.done}
          onTabChange={onTabChange}
        />
      </header>

      <CategoryChips
        options={CATEGORY_FILTERS}
        selected={category}
        onSelect={onCategoryChange}
        label="種類で絞り込み"
      />

      {/* The newer-version notice takes the cannot-save notice's place and box (AC15, AC30). */}
      {saveNotice === 'none' ? null : (
        <p role="status" className="mx-5 mb-3 rounded-xl bg-panel px-3.5 py-2.5 text-12 leading-note text-danger">
          {SAVE_NOTICE_TEXTS[saveNotice]}
        </p>
      )}

      {/* A quiet hint, not a warning: no box, no role (AC39). */}
      {showRestoreHint ? <p className="mx-5 mb-3 text-12 leading-note text-ink-muted">{RESTORE_HINT}</p> : null}

      {/* pt-1/-mt-1: room for the first card's focus outline inside the scroll container. */}
      <div className="scrollbar-hidden -mt-1 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-safe-list pt-1">
        {visibleSpots.length === 0 ? (
          <EmptyState
            title="まだありません"
            description={
              <>
                行ったスポットは、詳細画面の
                <br />
                「行った！」ボタンでここに移ります
              </>
            }
          />
        ) : (
          // role="list" keeps the list semantics in Safari, which drops them with list-style: none.
          <ul role="list" className="flex flex-col gap-2.5">
            {visibleSpots.map((spot) => (
              <li key={spot.id}>
                <SpotCard
                  ref={(element) => {
                    if (element === null) return
                    cardElements.current.set(spot.id, element)
                    return () => {
                      cardElements.current.delete(spot.id)
                    }
                  }}
                  mark={CATEGORY_MARKS[spot.category]}
                  name={spot.name}
                  region={spot.region}
                  category={spot.category}
                  exitInterchange={spot.exitInterchange}
                  done={spot.done}
                  onOpen={() => onOpenSpot(spot.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAddSpot()}
        className="absolute right-5 bottom-safe-fab flex h-14 items-center gap-2 rounded-full bg-accent pl-4.5 pr-5.5 text-16 font-bold text-canvas shadow-fab"
      >
        <Icon name="plus" size={20} strokeWidth={2.6} />
        スポットを追加
      </button>
    </section>
  )
}
