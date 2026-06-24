'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

export interface TermTooltipProps {
  term: string
  reading?: string
  shortDef: string
  /** 用語ページ slug（「もっと知る」リンク先） */
  slug: string
  className?: string
}

/**
 * 用語インライン解説（molecule / client）。
 * 朱の点線下線。ホバー・フォーカス・タップで簡潔な定義をポップオーバー表示する。
 * A11y: ボタン化し、ホバー依存にしない（フォーカス/タップでも開く）。
 */
export function TermTooltip({
  term,
  reading,
  shortDef,
  slug,
  className,
}: TermTooltipProps) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="cursor-help border-b border-dashed border-ck-mark text-left text-ck-text"
      >
        {term}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1 block w-64 rounded-md border border-ck-border bg-ck-surface p-3 text-left shadow-[var(--shadow-ck-md)]"
        >
          <span className="block text-sm font-semibold text-ck-text">
            {term}
            {reading && (
              <span className="ml-1 text-xs font-normal text-ck-text-muted">
                {reading}
              </span>
            )}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-ck-text-muted">
            {shortDef}
          </span>
          <Link
            href={`/glossary/${slug}`}
            className="ck-num mt-2 inline-block text-xs uppercase tracking-wide text-ck-accent hover:underline"
          >
            もっと知る ▸
          </Link>
        </span>
      )}
    </span>
  )
}
