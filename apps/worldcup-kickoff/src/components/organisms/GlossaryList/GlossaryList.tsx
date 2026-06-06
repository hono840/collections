'use client'

import { useId, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { GlossaryItem } from '@/components/molecules/GlossaryItem'
import { FilterTabs } from '@/components/molecules/FilterTabs'
import { EmptyState } from '@/components/atoms/EmptyState'
import { cn } from '@/lib/utils/cn'
import type { Term, TermCategory } from '@/lib/domain'

/** カテゴリフィルタの値（"all" は全件） */
type CategoryFilter = TermCategory | 'all'

const CATEGORY_OPTIONS: ReadonlyArray<{ value: CategoryFilter; label: string }> =
  [
    { value: 'all', label: 'すべて' },
    { value: 'rule', label: 'ルール' },
    { value: 'position', label: 'ポジション' },
    { value: 'tournament', label: '大会' },
    { value: 'stat', label: '記録' },
  ]

export interface GlossaryListProps {
  /** 用語じてんの全エントリ（Server Component で取得して渡す） */
  terms: Term[]
  className?: string
}

/** 検索クエリにマッチするか（用語・読み・意味を対象） */
function matchesQuery(term: Term, query: string): boolean {
  if (query === '') return true
  const q = query.toLowerCase()
  return (
    term.termJa.toLowerCase().includes(q) ||
    (term.reading?.toLowerCase().includes(q) ?? false) ||
    term.definitionJa.toLowerCase().includes(q)
  )
}

/**
 * 用語じてん一覧。検索（用語・読み・意味）＋カテゴリフィルタで絞り込み、
 * `<dl>` 内に GlossaryItem を列挙する。anchorId で個別リンク可。
 * Client Component（検索・フィルタ状態を保持）。
 */
export function GlossaryList({ terms, className }: GlossaryListProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const searchId = useId()

  const filtered = useMemo(() => {
    return terms.filter(
      (term) =>
        (category === 'all' || term.category === category) &&
        matchesQuery(term, query),
    )
  }, [terms, category, query])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* 検索バー */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        {/*
          type="text" を使う理由: type="search" だと WebKit/Chrome が
          ネイティブのクリア（×）ボタンを出し、自前のクリアボタンと二重表示に
          なるため。検索キーボード最適化は inputMode="search" で担保する。
        */}
        <input
          id={searchId}
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="用語を検索（例: オフサイド）"
          aria-label="用語を検索"
          className="min-h-11 w-full rounded-2xl border border-border bg-surface py-2 pr-10 pl-9 text-sm text-text placeholder:text-text-muted"
        />
        {query !== '' ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="検索をクリア"
            className="absolute top-1/2 right-2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* カテゴリフィルタ */}
      <FilterTabs
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
        ariaLabel="カテゴリで絞り込み"
        scrollable
      />

      {/* 件数表示 */}
      <p className="text-xs text-text-muted" aria-live="polite">
        {filtered.length}件の用語
      </p>

      {/* 一覧 */}
      {filtered.length > 0 ? (
        <dl className="flex flex-col gap-2">
          {filtered.map((term) => (
            <GlossaryItem
              key={term.slug}
              anchorId={term.slug}
              termJa={term.termJa}
              reading={term.reading}
              definitionJa={term.definitionJa}
              category={term.category}
            />
          ))}
        </dl>
      ) : (
        <EmptyState
          title="該当する用語がありません"
          description="検索ワードやカテゴリを変えてみてください。"
        />
      )}
    </div>
  )
}
