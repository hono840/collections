'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Badge } from '@/components/atoms/Badge'
import { Icon } from '@/components/atoms/Icon'
import { PrimaryButton } from '@/components/atoms/PrimaryButton'
import { TextField } from '@/components/atoms/TextField'
import { InfoTile } from '@/components/molecules/InfoTile'
import type { Spot } from '@/lib/spots/types'

const NOT_ENTERED = '未入力'
// Same placeholder as the add form's memo field.
const MEMO_PLACEHOLDER = '例：冬は通行止め。帰りに寄りたいお店など'

/** What focusOnMount focuses: the spot name (opened from the list) or スポットを編集 (back from editing, AC48). */
export type SpotDetailFocusTarget = 'heading' | 'editSpot'

type SpotDetailScreenProps = {
  spot: Spot
  onBack: () => void
  onToggleDone: () => void
  /** Called on the second press of the delete button (AC8). */
  onRemove: () => void
  /** Called on 保存 with the memo exactly as typed; updateMemo trims it (AC24). */
  onUpdateMemo: (memo: string) => void
  /** スポットを編集: go to the edit form. A memo draft is thrown away with the screen (AC41, AC25). */
  onEdit: () => void
  /** Move focus to focusTarget when the screen appears. */
  focusOnMount?: boolean
  /** Only with focusOnMount. Defaults to the spot name. */
  focusTarget?: SpotDetailFocusTarget
}

/**
 * 詳細. The first press of 「このスポットを削除」 only arms the delete; that state lives here, so
 * leaving the screen (unmount) cancels it. No window.confirm (AC8).
 * Editing the memo and its draft live here too: leaving the screen discards the draft, while actions
 * that stay on it (行った！にする) keep it (AC25).
 */
export function SpotDetailScreen({
  spot,
  onBack,
  onToggleDone,
  onRemove,
  onUpdateMemo,
  onEdit,
  focusOnMount = false,
  focusTarget = 'heading',
}: SpotDetailScreenProps) {
  const headingId = useId()
  const memoHeadingId = `${headingId}-memo-heading`
  const memoFieldId = `${headingId}-memo-field`
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [editingMemo, setEditingMemo] = useState(false)
  const [memoDraft, setMemoDraft] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const editSpotButtonRef = useRef<HTMLButtonElement>(null)
  const memoFieldRef = useRef<HTMLTextAreaElement>(null)
  const editMemoButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!focusOnMount) return
    if (focusTarget === 'editSpot') {
      editSpotButtonRef.current?.focus()
    } else {
      headingRef.current?.focus()
    }
  }, [focusOnMount, focusTarget])

  function handleToggleDone() {
    // Doing something else cancels a half-done delete.
    setDeleteArmed(false)
    onToggleDone()
  }

  function startEditingMemo() {
    // flushSync renders the text field right away so it can take focus (AC23). Starting to edit
    // cancels a half-done delete (AC29). The draft starts from the memo shown now.
    flushSync(() => {
      setDeleteArmed(false)
      setMemoDraft(spot.memo)
      setEditingMemo(true)
    })
    const memoField = memoFieldRef.current
    if (memoField === null) return
    memoField.focus()
    // Cursor at the end: a memo is usually added to (docs/design/memo-edit.md).
    memoField.setSelectionRange(memoField.value.length, memoField.value.length)
  }

  /** Back to reading; focus returns to メモを編集 (AC24, AC25). */
  function finishEditingMemo() {
    flushSync(() => {
      setDeleteArmed(false)
      setEditingMemo(false)
    })
    // Null when saving closed the detail (another tab deleted the spot, AC27); the list takes focus.
    editMemoButtonRef.current?.focus()
  }

  function handleSaveMemo() {
    onUpdateMemo(memoDraft)
    finishEditingMemo()
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
        {/* Gray like the list's バックアップ: this bar moves to another screen. The visible text is the
            name, so no aria-label (WCAG 2.5.3, AC41). */}
        <button
          type="button"
          ref={editSpotButtonRef}
          onClick={() => onEdit()}
          className="ml-auto h-11 min-w-11 bg-transparent px-2 text-15 font-medium text-ink-soft"
        >
          スポットを編集
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
          {/* Full width: IC names get long (AC47). Shown as entered, without で降りる. */}
          <InfoTile
            label="降りるIC"
            value={spot.exitInterchange === '' ? NOT_ENTERED : spot.exitInterchange}
            wide
          />
          <InfoTile label="おすすめ時期" value={spot.season === '' ? NOT_ENTERED : spot.season} wide />
        </dl>

        <div className="flex flex-col">
          {/* 44px row for the 44px buttons; -mt-3 keeps the メモ heading where it was. */}
          <div className="-mt-3 flex h-11 items-center justify-between">
            <h2 id={memoHeadingId} className="text-13 font-medium text-ink-muted">
              メモ
            </h2>
            {/* -mr-2 lines the button text up with the memo's right edge. */}
            <div className="-mr-2 flex items-center gap-2">
              {editingMemo ? (
                <>
                  <button
                    type="button"
                    onClick={finishEditingMemo}
                    className="h-11 min-w-11 bg-transparent px-2 text-15 text-ink-soft"
                  >
                    キャンセル
                  </button>
                  {/* Always enabled: an empty memo can be saved (AC24). */}
                  <button
                    type="button"
                    onClick={handleSaveMemo}
                    className="h-11 min-w-11 bg-transparent px-2 text-15 font-bold text-accent"
                  >
                    保存
                  </button>
                </>
              ) : (
                // The visible 編集 is part of the name 「メモを編集」 (WCAG 2.5.3, AC29).
                <button
                  type="button"
                  ref={editMemoButtonRef}
                  onClick={startEditingMemo}
                  aria-label="メモを編集"
                  className="h-11 min-w-11 bg-transparent px-2 text-15 font-bold text-accent"
                >
                  編集
                </button>
              )}
            </div>
          </div>
          {editingMemo ? (
            // Named メモ by the heading, so no second visible label (AC29).
            <TextField
              multiline
              rows={4}
              id={memoFieldId}
              labelledBy={memoHeadingId}
              ref={memoFieldRef}
              placeholder={MEMO_PLACEHOLDER}
              value={memoDraft}
              onValueChange={setMemoDraft}
            />
          ) : (
            // pre-line keeps the memo's line breaks (AC6).
            <p className="min-h-18 whitespace-pre-line rounded-tile bg-panel p-4 text-15 leading-memo text-ink-memo wrap-anywhere">
              {spot.memo === '' ? 'メモはまだありません' : spot.memo}
            </p>
          )}
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
