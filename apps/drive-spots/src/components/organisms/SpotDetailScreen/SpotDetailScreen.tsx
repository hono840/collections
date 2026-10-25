'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Icon } from '@/components/atoms/Icon'
import { PrimaryButton } from '@/components/atoms/PrimaryButton'
import { InfoTile } from '@/components/molecules/InfoTile'
import type { Spot } from '@/lib/spots/types'

const NOT_ENTERED = '未入力'

type SpotDetailScreenProps = {
  spot: Spot
  onBack: () => void
  onToggleDone: () => void
  /** Called on the second press of the delete button (AC8). */
  onRemove: () => void
  /** Move focus to the spot name when the screen appears. */
  focusOnMount?: boolean
}

/**
 * 詳細. The first press of 「このスポットを削除」 only arms the delete; that state lives here, so
 * leaving the screen (unmount) cancels it. No window.confirm (AC8).
 */
export function SpotDetailScreen({ spot, onBack, onToggleDone, onRemove, focusOnMount = false }: SpotDetailScreenProps) {
  const headingId = useId()
  const [deleteArmed, setDeleteArmed] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  function handleToggleDone() {
    // Doing something else cancels a half-done delete.
    setDeleteArmed(false)
    onToggleDone()
  }

  function handleDelete() {
    if (deleteArmed) {
      onRemove()
    } else {
      setDeleteArmed(true)
    }
  }

  return (
    <section aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center px-3 pb-2 pt-safe-bar">
        <button
          type="button"
          onClick={() => onBack()}
          aria-label="一覧にもどる"
          className="flex size-11 items-center justify-center rounded-xl bg-transparent"
        >
          <Icon name="chevronLeft" size={24} strokeWidth={2.2} className="text-ink" />
        </button>
      </div>

      <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-y-contain px-5 pb-safe-detail pt-1">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Badge tone="accent">{spot.category}</Badge>
            {spot.done ? <Badge tone="done">行った</Badge> : null}
          </div>
          <h1
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-30 font-bold leading-title wrap-anywhere focus:outline-none"
          >
            {spot.name}
          </h1>
        </div>

        <dl className="grid grid-cols-2 gap-2.5">
          <InfoTile label="地域" value={spot.region} />
          <InfoTile
            label="自宅からの距離（片道）"
            value={spot.distanceKm === '' ? NOT_ENTERED : `約 ${spot.distanceKm} km`}
          />
          <InfoTile label="おすすめ時期" value={spot.season === '' ? NOT_ENTERED : spot.season} wide />
        </dl>

        <div className="flex flex-col gap-2">
          <h2 className="text-13 font-medium text-ink-muted">メモ</h2>
          {/* pre-line keeps the memo's line breaks (AC6). */}
          <p className="min-h-18 whitespace-pre-line rounded-tile bg-panel p-4 text-15 leading-memo text-ink-memo wrap-anywhere">
            {spot.memo === '' ? 'メモはまだありません' : spot.memo}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          {spot.done ? (
            <PrimaryButton tone="outline" onClick={handleToggleDone}>
              「行きたい」に戻す
            </PrimaryButton>
          ) : (
            <PrimaryButton tone="done" onClick={handleToggleDone}>
              <Icon name="check" size={22} strokeWidth={2.6} />
              行った！にする
            </PrimaryButton>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 bg-transparent text-15 font-medium text-danger"
          >
            {deleteArmed ? 'もう一度押すと削除します' : 'このスポットを削除'}
          </button>
        </div>
      </div>
    </section>
  )
}
