'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Category } from '@/types/app'

export interface TransactionFiltersProps {
  categories: Category[]
}

export function TransactionFilters({ categories }: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [panelOpen, setPanelOpen] = useState(false)

  // Read current filters from URL
  const activeFrom = searchParams.get('from') ?? ''
  const activeTo = searchParams.get('to') ?? ''
  const activeCategories = searchParams.getAll('category')
  const activeMinAmount = searchParams.get('minAmount') ?? ''
  const activeMaxAmount = searchParams.get('maxAmount') ?? ''

  // Count active filters (excluding search query)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeFrom) count++
    if (activeTo) count++
    if (activeCategories.length > 0) count += activeCategories.length
    if (activeMinAmount) count++
    if (activeMaxAmount) count++
    return count
  }, [activeFrom, activeTo, activeCategories, activeMinAmount, activeMaxAmount])

  // Build URL with updated params
  const pushParams = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        params.delete(key)
        if (value === null || value === '') continue
        if (Array.isArray(value)) {
          for (const v of value) {
            params.append(key, v)
          }
        } else {
          params.set(key, value)
        }
      }

      // Reset to page 1 when filters change
      params.delete('page')

      router.push(`/transactions?${params.toString()}`)
    },
    [router, searchParams]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get('q') ?? ''
      if (query !== current) {
        pushParams({ q: query || null })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchParams, pushParams])

  function handleCategoryToggle(categoryId: string) {
    const next = activeCategories.includes(categoryId)
      ? activeCategories.filter((id) => id !== categoryId)
      : [...activeCategories, categoryId]
    pushParams({ category: next.length > 0 ? next : null })
  }

  function handleDateChange(field: 'from' | 'to', value: string) {
    pushParams({ [field]: value || null })
  }

  function handleAmountChange(field: 'minAmount' | 'maxAmount', value: string) {
    pushParams({ [field]: value || null })
  }

  function handleClearAll() {
    setQuery('')
    router.push('/transactions')
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Search bar + filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="メモで検索..."
            className={cn(
              'w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm',
              'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
              'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-brand-500'
            )}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className={cn(
            'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
            panelOpen
              ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-500'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
          )}
          aria-label="フィルター"
        >
          <SlidersHorizontal className="h-4.5 w-4.5" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {panelOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="space-y-4">
            {/* Date range */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                期間
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={activeFrom}
                  onChange={(e) => handleDateChange('from', e.target.value)}
                  className={cn(
                    'flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm',
                    'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
                    'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                  )}
                />
                <span className="text-sm text-slate-400 dark:text-zinc-500">
                  ~
                </span>
                <input
                  type="date"
                  value={activeTo}
                  onChange={(e) => handleDateChange('to', e.target.value)}
                  className={cn(
                    'flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm',
                    'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
                    'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                  )}
                />
              </div>
            </div>

            {/* Category checkboxes */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                カテゴリ
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isChecked = activeCategories.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryToggle(cat.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                        isChecked
                          ? 'border-transparent text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-750'
                      )}
                      style={
                        isChecked
                          ? { backgroundColor: cat.color }
                          : undefined
                      }
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount range */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                金額
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={activeMinAmount}
                  onChange={(e) =>
                    handleAmountChange('minAmount', e.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="下限"
                  className={cn(
                    'min-h-[44px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums',
                    'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
                    'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'
                  )}
                />
                <span className="text-sm text-slate-400 dark:text-zinc-500">
                  ~
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={activeMaxAmount}
                  onChange={(e) =>
                    handleAmountChange('maxAmount', e.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="上限"
                  className={cn(
                    'min-h-[44px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums',
                    'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
                    'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'
                  )}
                />
              </div>
            </div>

            {/* Clear button */}
            {(activeFilterCount > 0 || query) && (
              <button
                onClick={handleClearAll}
                className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-500 dark:hover:text-brand-400"
              >
                フィルターをクリア
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
