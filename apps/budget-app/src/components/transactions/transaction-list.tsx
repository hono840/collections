'use client'

import { useState } from 'react'
import type { TransactionWithCategory } from '@/types/app'
import type { Category } from '@/types/app'
import { formatDate } from '@/lib/utils/format'
import { TransactionRow } from '@/components/transactions/transaction-row'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
}

/** Group transactions by date string (yyyy-MM-dd) */
function groupByDate(
  transactions: TransactionWithCategory[]
): Map<string, TransactionWithCategory[]> {
  const map = new Map<string, TransactionWithCategory[]>()
  for (const tx of transactions) {
    const key = tx.date
    const group = map.get(key)
    if (group) {
      group.push(tx)
    } else {
      map.set(key, [tx])
    }
  }
  return map
}

export function TransactionList({
  transactions,
  categories,
}: TransactionListProps) {
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithCategory | null>(null)

  const grouped = groupByDate(transactions)

  return (
    <>
      <div className="flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([date, txs]) => (
          <section key={date}>
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {formatDate(date, 'M月d日（EEEE）')}
            </h3>
            <div className="flex flex-col gap-1.5">
              {txs.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  onClick={setEditingTransaction}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Edit dialog */}
      <EditTransactionDialog
        transaction={editingTransaction}
        categories={categories}
        onClose={() => setEditingTransaction(null)}
      />
    </>
  )
}
