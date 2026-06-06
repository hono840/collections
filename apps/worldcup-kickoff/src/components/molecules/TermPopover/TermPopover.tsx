'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'

export interface TermPopoverTerm {
  /** 用語（例: "オフサイド"） */
  termJa: string
  /** 用語の解説（ポップオーバー本文） */
  definitionJa: string
  /** 読み仮名（任意） */
  reading?: string
}

export interface TermPopoverProps {
  /** ポップオーバーで解説する用語 */
  term: TermPopoverTerm
  /** ハイライト対象の本文テキスト（既定: term.termJa） */
  children?: React.ReactNode
  className?: string
}

/**
 * 本文中の用語をハイライトし、タップ/フォーカスで解説ポップオーバーを開く。
 * Radix 等は使わず、ネイティブ button + 自前の軽量ポップオーバーで実装する。
 *
 * A11y:
 * - トリガーは `<button aria-expanded aria-controls>`。
 * - ポップオーバーは `role="tooltip"`、id で関連付け。
 * - Escape で閉じてトリガーへフォーカスを戻す。外側クリックでも閉じる。
 * Client Component。
 */
export function TermPopover({ term, children, className }: TermPopoverProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const popoverId = `term-popover-${id}`
  const containerRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  // Escape で閉じる + トリガーへフォーカスを戻す
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

  // 外側クリックで閉じる（フォーカスは戻さない）
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  const label = typeof children === 'string' ? children : term.termJa

  return (
    <span ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline cursor-help rounded-sm font-bold text-pitch-700 underline decoration-pitch-300 decoration-dotted underline-offset-2 transition-colors hover:text-pitch-800',
        )}
      >
        {children ?? term.termJa}
      </button>

      {open ? (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-2 block w-64 max-w-[80vw] rounded-2xl border border-border bg-surface p-3 text-left shadow-md"
        >
          <span className="block text-sm font-bold text-text">
            {term.termJa}
            {term.reading ? (
              <span className="ml-1.5 text-xs font-normal text-text-muted">
                {term.reading}
              </span>
            ) : null}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-text-muted">
            {term.definitionJa}
          </span>
          <span className="sr-only">{`${label} の用語解説`}</span>
        </span>
      ) : null}
    </span>
  )
}
