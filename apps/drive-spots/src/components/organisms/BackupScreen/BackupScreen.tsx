'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { flushSync } from 'react-dom'
import { Icon } from '@/components/atoms/Icon'
import { PrimaryButton } from '@/components/atoms/PrimaryButton'
import { InfoTile } from '@/components/molecules/InfoTile'
import { BACKUP_FILE_MAX_BYTES, formatBackupDate, formatCalendarDate, parseBackupFile } from '@/lib/spots/backup'
import { countByTab } from '@/lib/spots/spots'
import { SAVE_NOTICE_TEXTS } from '@/lib/spots/types'
import type { SaveNotice, Spot, SpotsData } from '@/lib/spots/types'

const NEVER_EXPORTED_TEXT = 'まだ書き出していません'
// AC36: past tense, unlike the AC15 notice: this import was not saved.
const NOT_SAVED_AFTER_IMPORT_TEXT = 'この端末では保存できませんでした（再読み込みで消えます）'

type ImportError = 'too-big' | 'invalid' | 'newer'

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'too-big': 'ファイルが大きすぎます（1MB まで）',
  invalid: 'ドライブスポット帳のバックアップファイルではないか、壊れています',
  newer: '新しい版のアプリで作られたファイルです。ページを再読み込みしてから、もう一度読み込んでください',
}

/** What the import part of the screen shows. `fileChoice` re-creates the alert for every choice. */
type ImportState =
  | { kind: 'idle' }
  | { kind: 'error'; error: ImportError; fileChoice: number }
  | { kind: 'preview'; data: SpotsData; exportedAt: Date }
  | { kind: 'done'; data: SpotsData }

type BackupScreenProps = {
  /** What the app shows now; only counted for the preview (AC35). */
  spots: Spot[]
  /** null = never exported (AC33). */
  lastBackupAt: Date | null
  /**
   * Same value as the list's. 'newer-version' shows the AC30 notice and turns export and import off
   * (AC32); 'unavailable' adds the not-saved line after 置き換える (AC36).
   */
  saveNotice: SaveNotice
  onBack: () => void
  /** ファイルに書き出す; the app downloads the file and records the time (AC32, AC33). */
  onExport: () => void
  /** 置き換える, with the file's data exactly as checked (nextId included, AC36). */
  onReplace: (data: SpotsData) => void
  /** Move focus to the heading when the screen appears. */
  focusOnMount?: boolean
}

/** '行きたい N / 行った N' as one string, so it stays one text node (docs/design/backup.md). */
function formatCounts(spots: Spot[]): string {
  const counts = countByTab(spots)
  return `行きたい ${counts.want} / 行った ${counts.done}`
}

/**
 * バックアップ (AC31-AC37). Export is the app's job (onExport); importing is checked here: the size
 * before reading, then parseBackupFile, then a preview, and only 置き換える calls onReplace. The
 * result of a check lives here, so leaving the screen (unmount) discards it without changing
 * anything (AC35). File content is only ever rendered as text (AC37), and nothing uses the network.
 * With data from a newer version, the screen's data is not the saved data, so neither export nor
 * import is offered: a file of seed data must not pass for a real backup (AC32).
 */
export function BackupScreen({
  spots,
  lastBackupAt,
  saveNotice,
  onBack,
  onExport,
  onReplace,
  focusOnMount = false,
}: BackupScreenProps) {
  const headingId = useId()
  const fileInputId = `${headingId}-file`
  const errorId = `${headingId}-error`
  const newerVersionNoticeId = `${headingId}-newer-version`
  const notSavedId = `${headingId}-not-saved`
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' })
  const backupDisabled = saveNotice === 'newer-version'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const previewHeadingRef = useRef<HTMLHeadingElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)
  // Numbers every file choice, so a file that finishes reading after a newer choice is ignored.
  const fileChoiceCountRef = useRef(0)

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const fileInput = event.currentTarget
    const file = fileInput.files?.[0]
    // Closing the file chooser without a file changes nothing.
    if (file === undefined) return
    // Emptied so that choosing the same file again fires another change (docs/design/backup.md).
    fileInput.value = ''
    fileChoiceCountRef.current += 1
    const fileChoice = fileChoiceCountRef.current

    // AC34: the size comes from the file itself, before a single byte is read.
    if (file.size > BACKUP_FILE_MAX_BYTES) {
      setImportState({ kind: 'error', error: 'too-big', fileChoice })
      return
    }
    // The earlier result goes away at once, so an old preview cannot be replaced while this one is read.
    setImportState({ kind: 'idle' })

    let text: string
    try {
      text = await file.text()
    } catch {
      // A file that cannot be read is treated like a broken one.
      text = ''
    }
    if (fileChoice !== fileChoiceCountRef.current) return

    const parsedFile = parseBackupFile(text)
    if (parsedFile.kind !== 'ok') {
      setImportState({ kind: 'error', error: parsedFile.kind, fileChoice })
      return
    }
    // flushSync renders the preview right away so its title can take focus. Focus goes to the title,
    // not to 置き換える, so a stray Enter cannot replace the data; the whole box is scrolled into view.
    flushSync(() => {
      setImportState({ kind: 'preview', data: parsedFile.data, exportedAt: parsedFile.exportedAt })
    })
    previewHeadingRef.current?.focus({ preventScroll: true })
    previewRef.current?.scrollIntoView({ block: 'nearest' })
  }

  /** やめる: nothing changes; focus goes back to the file input (AC35). */
  function cancelImport() {
    setImportState({ kind: 'idle' })
    fileInputRef.current?.focus()
  }

  /** 置き換える (AC36). The box is its own confirmation, so there is no window.confirm. */
  function replaceWithFile() {
    if (importState.kind !== 'preview' || backupDisabled) return
    const { data } = importState
    onReplace(data)
    flushSync(() => {
      setImportState({ kind: 'done', data })
    })
    doneRef.current?.focus()
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
        <div className="flex flex-col gap-2">
          <h1
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-26 font-bold tracking-title focus:outline-none"
          >
            バックアップ
          </h1>
          <p className="text-14 leading-note text-ink-muted">
            スポットの記録をファイルに書き出しておくと、データが消えたときに、そのファイルを読み込んで元にもどせます。
          </p>
          {/* Not "never leaves the device": Safari can save downloads to iCloud Drive (docs/design/backup.md). */}
          <p className="text-14 leading-note text-ink-muted">
            ファイルは、この端末のダウンロード先に保存されます。このアプリは、データをどこにも送りません。
          </p>
        </div>

        {/* The list's AC30 notice, same text and box, explaining why both actions below are off (AC32). */}
        {backupDisabled ? (
          <p
            id={newerVersionNoticeId}
            role="status"
            className="rounded-xl bg-panel px-3.5 py-2.5 text-12 leading-note text-danger"
          >
            {SAVE_NOTICE_TEXTS['newer-version']}
          </p>
        ) : null}

        <div className="flex flex-col gap-2.5">
          {/* A status region, so the new date is read out after an export (AC33). */}
          <div role="status" aria-atomic="true">
            <dl>
              <InfoTile
                label="最後に書き出した日"
                value={lastBackupAt === null ? NEVER_EXPORTED_TEXT : formatBackupDate(lastBackupAt, new Date())}
              />
            </dl>
          </div>
          <PrimaryButton tone="accent" onClick={onExport} disabled={backupDisabled}>
            ファイルに書き出す
          </PrimaryButton>
        </div>

        <div className="flex flex-col gap-3">
          {/* The real file input lies invisibly over its label, so the whole 56px shape can be pressed
              and is what a screen reader reaches; the focus outline and the dimmed look are on the label. */}
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              id={fileInputId}
              disabled={backupDisabled}
              aria-describedby={importState.kind === 'error' && !backupDisabled ? errorId : undefined}
              onChange={(event) => {
                void handleFileChange(event)
              }}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <label
              htmlFor={fileInputId}
              className="flex h-14 w-full items-center justify-center rounded-2xl border border-edge-chip text-16 font-bold text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-40"
            >
              ファイルから読み込む
            </label>
          </div>

          {/* While import is off (AC32), a check that was still running or already shown is not offered:
              no error and no 置き換える. A finished import (done) stays, since focus is on it. */}
          {importState.kind === 'error' && !backupDisabled ? (
            // A new element for every choice, so the same error is announced again (AC34).
            <p key={importState.fileChoice} id={errorId} role="alert" className="text-13 leading-note text-danger">
              {IMPORT_ERROR_MESSAGES[importState.error]}
            </p>
          ) : null}

          {importState.kind === 'preview' && !backupDisabled ? (
            <div ref={previewRef} className="flex flex-col gap-4 rounded-tile bg-panel p-4">
              <h2 ref={previewHeadingRef} tabIndex={-1} className="text-13 font-medium text-ink-muted focus:outline-none">
                {`${formatCalendarDate(importState.exportedAt)}に書き出したファイル`}
              </h2>
              <p className="font-display text-18 font-bold">{formatCounts(importState.data.spots)}</p>
              <p className="text-14 leading-note text-ink">
                {`いまのデータ（${formatCounts(spots)}）は、このファイルの中身に置き換わります。`}
              </p>
              <div className="flex flex-col">
                <PrimaryButton tone="danger" onClick={replaceWithFile}>
                  置き換える
                </PrimaryButton>
                <button
                  type="button"
                  onClick={cancelImport}
                  className="h-12 bg-transparent text-15 font-medium text-ink-soft"
                >
                  やめる
                </button>
              </div>
            </div>
          ) : null}

          {importState.kind === 'done' ? (
            // Focused instead of given a role, so it is read once (docs/design/backup.md). When the
            // import could not be saved, the focus also reads why, through aria-describedby (AC36, AC30).
            <p
              ref={doneRef}
              tabIndex={-1}
              aria-describedby={
                saveNotice === 'unavailable' ? notSavedId : backupDisabled ? newerVersionNoticeId : undefined
              }
              className="flex items-center gap-2 rounded-xl bg-panel px-3.5 py-3 text-14 font-bold text-done focus:outline-none"
            >
              <Icon name="check" size={18} strokeWidth={2.6} />
              {`読み込みました（${formatCounts(importState.data.spots)}）`}
            </p>
          ) : null}

          {/* A separate line below, so 読み込みました keeps its exact text (AC36). */}
          {importState.kind === 'done' && saveNotice === 'unavailable' ? (
            <p id={notSavedId} className="text-13 leading-note text-danger">
              {NOT_SAVED_AFTER_IMPORT_TEXT}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
