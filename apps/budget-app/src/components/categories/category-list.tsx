'use client'

import { useState } from 'react'
import type { Category } from '@/types/app'
import { CategoryCard } from '@/components/categories/category-card'
import { CategoryFormDialog } from '@/components/categories/category-form-dialog'
import { Plus } from 'lucide-react'

interface CategoryListProps {
  categories: Category[]
}

export function CategoryList({ categories }: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <>
      {/* Create button */}
      <div className="mb-4">
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          新規作成
        </button>
      </div>

      {/* Category cards */}
      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={setEditingCategory}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CategoryFormDialog
        open={isCreating}
        onClose={() => setIsCreating(false)}
        category={null}
      />

      {/* Edit dialog */}
      <CategoryFormDialog
        open={editingCategory !== null}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
      />
    </>
  )
}
