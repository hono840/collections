'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { UpsertBudgetSchema } from '@/lib/validations/budget'

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function upsertBudget(
  formData: FormData
): Promise<ActionResult> {
  // Validate input
  const parsed = UpsertBudgetSchema.safeParse({
    categoryId: formData.get('categoryId'),
    amount: formData.get('amount'),
    month: formData.get('month'),
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

  // Check if budget already exists for this category + month
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', user.id)
    .eq('category_id', parsed.data.categoryId)
    .eq('month', parsed.data.month)
    .maybeSingle()

  if (existing) {
    // Update existing budget
    const { error } = await supabase
      .from('budgets')
      .update({ amount: parsed.data.amount })
      .eq('id', existing.id)

    if (error) {
      return { success: false, error: '予算の更新に失敗しました' }
    }
  } else {
    // Insert new budget
    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      category_id: parsed.data.categoryId,
      amount: parsed.data.amount,
      month: parsed.data.month,
    })

    if (error) {
      return { success: false, error: '予算の保存に失敗しました' }
    }
  }

  revalidatePath('/budgets')
  revalidatePath('/dashboard')

  return { success: true }
}
