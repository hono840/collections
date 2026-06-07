'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { TierLegend } from '@/components/molecules/TierLegend'

export interface TierLegendDialogProps {
  /** トリガー（ボタン）の中身。バッジやアイコン+テキストなど */
  children: React.ReactNode
  /** トリガーボタンの追加クラス */
  triggerClassName?: string
  /** トリガーの aria-label（中身がテキストでない/補足したいとき） */
  triggerAriaLabel?: string
  /** ダイアログ見出し */
  title?: string
}

/**
 * バッジ等のトリガーから開く「ランク（tier）の見方」モーダルダイアログ。
 * Radix 等は使わず、ネイティブ button + 自前の軽量ダイアログで実装する。
 * 中身は表示専用の TierLegend を流用する。
 *
 * A11y:
 * - トリガーは `<button aria-haspopup="dialog" aria-expanded aria-controls>`。
 * - パネルは `role="dialog" aria-modal="true" aria-labelledby`。
 * - 開いたら閉じるボタンへフォーカス移動。Escape / バックドロップで閉じて
 *   トリガーへフォーカスを戻す。開いている間は body スクロールを抑止。
 * Client Component。
 */
export function TierLegendDialog({
  children,
  triggerClassName,
  triggerAriaLabel,
  title = 'ランク（tier）の見方',
}: TierLegendDialogProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const dialogId = `tier-legend-dialog-${id}`
  const titleId = `tier-legend-dialog-title-${id}`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  // 開いたら閉じるボタンへフォーカスを移動（モーダルの起点を明示）
  useEffect(() => {
    if (!open) return
    closeButtonRef.current?.focus()
  }, [open])

  // Escape で閉じる + トリガーへフォーカスを戻す（TermPopover 同様 document リスナ）
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  // 開いている間は背後のスクロールを抑止（effect 内のみ DOM に触れ SSR セーフに）
  useEffect(() => {
    if (!open) return
    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={triggerAriaLabel}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {children}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          // バックドロップのクリックで閉じる（トリガーへフォーカスを戻す）。
          // パネル内クリックは下の onClick stopPropagation で抑止する。
          onClick={() => close(true)}
        >
          {/* 半透明バックドロップ */}
          <div aria-hidden className="absolute inset-0 bg-black/40" />
          <div
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 flex max-h-[85vh] w-full max-w-[90vw] flex-col rounded-2xl bg-surface shadow-md sm:max-w-md"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <h2 id={titleId} className="text-base font-bold text-text">
                {title}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="閉じる"
                onClick={() => close(true)}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-pitch-50 hover:text-text"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <TierLegend />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
