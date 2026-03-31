'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface TransactionPaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
}

export function TransactionPagination({
  currentPage,
  totalPages,
  totalCount,
}: TransactionPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (page <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    router.push(`/transactions?${params.toString()}`)
  }

  // Generate page numbers to show
  function getPageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  const buttonBase = cn(
    'flex h-9 min-w-[36px] items-center justify-center rounded-lg text-sm font-medium transition-colors',
    'border border-slate-200 dark:border-zinc-700'
  )

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="text-xs text-slate-500 dark:text-zinc-400">
        全{totalCount}件中 {(currentPage - 1) * 50 + 1}~
        {Math.min(currentPage * 50, totalCount)}件を表示
      </p>

      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            buttonBase,
            'px-2',
            currentPage <= 1
              ? 'cursor-not-allowed text-slate-300 dark:text-zinc-600'
              : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
          )}
          aria-label="前のページ"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((item, idx) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-9 w-9 items-center justify-center text-sm text-slate-400 dark:text-zinc-500"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => goToPage(item)}
              className={cn(
                buttonBase,
                'px-3',
                item === currentPage
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
              )}
            >
              {item}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            buttonBase,
            'px-2',
            currentPage >= totalPages
              ? 'cursor-not-allowed text-slate-300 dark:text-zinc-600'
              : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-750'
          )}
          aria-label="次のページ"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
