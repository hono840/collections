'use client'

import Link from 'next/link'
import { compareStore, useCompareList } from '@/features/compare/store'
import { compareLabel } from '@/features/compare/labels'

/**
 * 比較トレイ（organism / client）。
 * 選択中の車種を画面下部に固定表示し、比較ページへの導線を出す。
 * 0 件のときは何も表示しない。レイアウトに常駐させる。
 */
export function CompareTray() {
  const list = useCompareList()
  if (list.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ck-border-strong bg-ck-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <span className="ck-num text-xs uppercase tracking-wide text-ck-text-muted">
          比較 {list.length}/4
        </span>
        <ul className="flex flex-1 flex-wrap items-center gap-2">
          {list.map((ref) => (
            <li key={ref}>
              <span className="inline-flex items-center gap-1 rounded-sm border border-ck-border bg-ck-bg px-2 py-1 text-xs text-ck-text">
                {compareLabel(ref)}
                <button
                  type="button"
                  onClick={() => compareStore.remove(ref)}
                  aria-label={`${compareLabel(ref)} を比較から外す`}
                  className="ml-1 text-ck-text-muted transition-colors hover:text-ck-mark"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => compareStore.clear()}
          className="ck-num text-xs uppercase tracking-wide text-ck-text-muted transition-colors hover:text-ck-mark"
        >
          クリア
        </button>
        <Link
          href={`/compare?ids=${encodeURIComponent(list.join(','))}`}
          aria-disabled={list.length < 2}
          className={
            list.length < 2
              ? 'ck-num pointer-events-none rounded-sm border border-ck-border px-3 py-1.5 text-xs uppercase tracking-wide text-ck-text-muted opacity-50'
              : 'ck-num rounded-sm border-2 border-ck-accent px-3 py-1.5 text-xs uppercase tracking-wide text-ck-accent transition-colors hover:bg-ck-accent/10'
          }
        >
          比較する →
        </Link>
      </div>
    </div>
  )
}
