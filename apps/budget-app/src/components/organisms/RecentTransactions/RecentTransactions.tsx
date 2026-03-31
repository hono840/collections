'use client'

import { useState } from 'react'
import type { TransactionWithCategory, Category } from '@/types/app'
import { TransactionRow } from '@/components/molecules/TransactionRow'
import { EditTransactionDialog } from '@/components/organisms/EditTransactionDialog'

export interface RecentTransactionsProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
}

export function RecentTransactions({
  transactions,
  categories,
}: RecentTransactionsProps) {
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithCategory | null>(null)

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            onClick={setEditingTransaction}
          />
        ))}
      </div>

      <EditTransactionDialog
        transaction={editingTransaction}
        categories={categories}
        onClose={() => setEditingTransaction(null)}
      />
    </>
  )
}
