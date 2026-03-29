'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
} from '@/lib/validations/transaction'

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

export async function createTransaction(
  formData: FormData
): Promise<ActionResult> {
  // Validate input
  const parsed = CreateTransactionSchema.safeParse({
    amount: formData.get('amount'),
    categoryId: formData.get('categoryId'),
    date: formData.get('date'),
    note: formData.get('note'),
    type: formData.get('type') || 'expense',
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

  // Insert
  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    date: parsed.data.date,
    note: parsed.data.note ?? '',
  })

  if (error) {
    return { success: false, error: '保存に失敗しました' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return { success: true }
}

export async function updateTransaction(
  formData: FormData
): Promise<ActionResult> {
  // Validate input
  const parsed = UpdateTransactionSchema.safeParse({
    id: formData.get('id'),
    amount: formData.get('amount'),
    categoryId: formData.get('categoryId'),
    date: formData.get('date'),
    note: formData.get('note'),
    type: formData.get('type') || 'expense',
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
    .from('transactions')
    .update({
      category_id: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: parsed.data.date,
      note: parsed.data.note ?? '',
    })
    .eq('id', parsed.data.id)

  if (error) {
    return { success: false, error: '更新に失敗しました' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return { success: true }
}

export async function deleteTransaction(
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

  // Delete (RLS ensures user can only delete their own)
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: '削除に失敗しました' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return { success: true }
}
