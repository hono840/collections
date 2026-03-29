'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Category } from '@/types/app'
import { QuickExpenseDialog } from '@/components/transactions/quick-expense-dialog'

interface QuickExpenseFabProps {
  categories: Category[]
}

export function QuickExpenseFab({ categories }: QuickExpenseFabProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:bg-brand-700 hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        aria-label="支出を記録"
      >
        <Plus className="h-6 w-6" />
      </button>

      <QuickExpenseDialog
        open={open}
        onClose={() => setOpen(false)}
        categories={categories}
      />
    </>
  )
}
