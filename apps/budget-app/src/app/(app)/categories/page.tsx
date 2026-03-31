import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CategoriesTemplate } from '@/components/templates/CategoriesTemplate'

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

  return <CategoriesTemplate categories={catList} />
}
