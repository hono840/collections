import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryList } from '@/components/categories/category-list'
import { Tag } from 'lucide-react'

export const metadata = {
  title: 'カテゴリ管理 | Budget App',
}

export default async function CategoriesPage() {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all non-archived categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_archived', false)
    .order('sort_order', { ascending: true })

  const catList = categories ?? []

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          カテゴリ管理
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          支出カテゴリの作成・編集・アーカイブ
        </p>
      </div>

      {/* Category list + create button */}
      <CategoryList categories={catList} />

      {catList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800">
            <Tag className="h-8 w-8 text-slate-400 dark:text-zinc-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 dark:text-zinc-300">
            カテゴリがまだありません
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            「新規作成」ボタンからカテゴリを追加しましょう
          </p>
        </div>
      )}
    </div>
  )
}
