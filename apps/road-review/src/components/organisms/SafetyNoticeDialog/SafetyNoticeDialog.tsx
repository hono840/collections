'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Alert } from '@/components/atoms/Alert'
import { Button } from '@/components/atoms/Button'
import type { ActionResult } from '@/lib/actions/result'

// M-31
const SAVE_FAILED_MESSAGE = '保存できませんでした。もう一度お試しください。'

export type SafetyNoticeDialogProps = {
  /** True once the user has pressed "確認しました". */
  acknowledged: boolean
  /** Saves the acknowledgement. A failed result (or a throw) keeps the notice open with an error. */
  onAcknowledge: () => Promise<ActionResult>
}

/**
 * First-run safety notice (S-04 / spec 4-7 FirstRunNotice).
 * Native modal <dialog>: bottom sheet under 768px, centered dialog above.
 * It cannot be dismissed by Esc, by the backdrop, or by an × button.
 */
export function SafetyNoticeDialog({ acknowledged, onAcknowledge }: SafetyNoticeDialogProps) {
  const [isOpen, setIsOpen] = useState(!acknowledged)
  if (!isOpen) return null
  return <SafetyNoticeModal onAcknowledge={onAcknowledge} onAcknowledged={() => setIsOpen(false)} />
}

function SafetyNoticeModal({
  onAcknowledge,
  onAcknowledged,
}: {
  onAcknowledge: () => Promise<ActionResult>
  onAcknowledged: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const acknowledgeButtonRef = useRef<HTMLButtonElement>(null)
  const inFlight = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Bumped on every failed save. The button is disabled while saving and
  // browsers drop its focus, so focus is put back once it is enabled again.
  const [failureCount, setFailureCount] = useState(0)
  const headingId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    headingRef.current?.focus()

    // Esc must not close the notice. Chrome may ignore preventDefault() on
    // "cancel" without user activation, so also block the key and reopen.
    const blockCancel = (event: Event) => event.preventDefault()
    const blockEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') event.preventDefault()
    }
    const reopen = () => {
      if (dialog.isConnected && !dialog.open) {
        dialog.showModal()
        headingRef.current?.focus()
      }
    }
    dialog.addEventListener('cancel', blockCancel)
    dialog.addEventListener('keydown', blockEscape)
    dialog.addEventListener('close', reopen)
    return () => {
      dialog.removeEventListener('cancel', blockCancel)
      dialog.removeEventListener('keydown', blockEscape)
      dialog.removeEventListener('close', reopen)
    }
  }, [])

  useEffect(() => {
    if (failureCount > 0) acknowledgeButtonRef.current?.focus()
  }, [failureCount])

  async function handleAcknowledge() {
    if (inFlight.current) return
    inFlight.current = true
    setIsSaving(true)
    setErrorMessage(null)
    let failedMessage: string | null = null
    try {
      const result = await onAcknowledge()
      if (!result.ok) failedMessage = result.error.message || SAVE_FAILED_MESSAGE
    } catch {
      failedMessage = SAVE_FAILED_MESSAGE
    }
    inFlight.current = false
    setIsSaving(false)
    if (failedMessage) {
      setErrorMessage(failedMessage)
      setFailureCount((count) => count + 1)
    } else {
      onAcknowledged()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={headingId}
      className={
        'text-ink bg-surface-raised shadow-3 backdrop:bg-scrim ' +
        // < 768px: bottom sheet (top corners rounded, no drag handle)
        'inset-x-0 bottom-0 top-auto m-0 mt-auto w-full max-w-full rounded-t-lg p-6 pb-8 motion-safe:animate-sheet-in ' +
        // >= 768px: centered dialog, max 480px
        'md:inset-0 md:m-auto md:max-w-120 md:rounded-lg md:pb-6 md:motion-safe:animate-dialog-in'
      }
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-bold text-ink focus-visible:outline-offset-4"
      >
        はじめに
      </h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed">
        {/* M-04 */}
        <p>
          運転中は操作しないでください。記録は安全な場所に停車してから、またはドライブの後に行ってください。このアプリは速度やタイムを扱わず、法律の範囲内でドライブ・ツーリングを楽しむための記録帳です。
        </p>
        {/* M-05 */}
        <p>道の情報（通行止めや施設など）は、あなた自身が確認して残す記録で、公式情報ではありません。</p>
      </div>

      {errorMessage ? (
        <Alert variant="error" className="mt-4">
          {errorMessage}
        </Alert>
      ) : null}

      <Button ref={acknowledgeButtonRef} className="mt-6 w-full" loading={isSaving} onClick={handleAcknowledge}>
        {isSaving ? '保存中…' : '確認しました'}
      </Button>
    </dialog>
  )
}
