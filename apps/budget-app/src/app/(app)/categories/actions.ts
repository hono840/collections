'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from '@/lib/validations/category'

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createCategory(
  formData: FormData
): Promise<ActionResult> {
  // Validate input
  const parsed = CreateCategorySchema.safeParse({
    name: formData.get('name'),
    icon: formData.get('icon') || 'circle',
    color: formData.get('color'),
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'バリデーションエラー' }
  }

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // Get max sort_order
  const { data: maxOrder } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1

  // Insert
  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: parsed.data.name,
    icon: parsed.data.icon,
    color: parsed.data.color,
    sort_order: nextOrder,
    is_default: false,
  })

  if (error) {
    return { success: false, error: 'カテゴリの作成に失敗しました' }
  }

  revalidatePath('/categories')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return { success: true }
}

export async function updateCategory(
  formData: FormData
): Promise<ActionResult> {
  // Validate input
  const parsed = UpdateCategorySchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    icon: formData.get('icon') || 'circle',
    color: formData.get('color'),
  })

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'バリデーションエラー' }
  }

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // Update (RLS ensures user can only update their own)
  const { error } = await supabase
    .from('categories')
    .update({
      name: parsed.data.name,
      icon: parsed.data.icon,
      color: parsed.data.color,
    })
    .eq('id', parsed.data.id)

  if (error) {
    return { success: false, error: 'カテゴリの更新に失敗しました' }
  }

  revalidatePath('/categories')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/budgets')

  return { success: true }
}

export async function archiveCategory(
  formData: FormData
): Promise<ActionResult> {
  const id = formData.get('id')

  if (typeof id !== 'string' || !id) {
    return { success: false, error: '無効なIDです' }
  }

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // Archive (soft delete) — RLS ensures user can only update their own
  const { error } = await supabase
    .from('categories')
    .update({ is_archived: true })
    .eq('id', id)

  if (error) {
    return { success: false, error: 'カテゴリのアーカイブに失敗しました' }
  }

  revalidatePath('/categories')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/budgets')

  return { success: true }
}

export async function reorderCategories(
  formData: FormData
): Promise<ActionResult> {
  // Expect a JSON string of ordered IDs
  const idsJson = formData.get('orderedIds')

  if (typeof idsJson !== 'string') {
    return { success: false, error: '無効なデータです' }
  }

  let orderedIds: string[]
  try {
    orderedIds = JSON.parse(idsJson)
  } catch {
    return { success: false, error: '無効なデータ形式です' }
  }

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { success: false, error: '無効なデータです' }
  }

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // Update sort_order for each category
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('categories')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('user_id', user.id)
  )

  const results = await Promise.all(updates)
  const hasError = results.some((r) => r.error)

  if (hasError) {
    return { success: false, error: '並び替えに失敗しました' }
  }

  revalidatePath('/categories')
  revalidatePath('/dashboard')

  return { success: true }
}
