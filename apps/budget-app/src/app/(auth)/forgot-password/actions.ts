'use server'

import { createClient } from '@/lib/supabase/server'
import { ResetPasswordSchema } from '@/lib/validations/auth'

export async function resetPassword(formData: FormData) {
  const raw = {
    email: formData.get('email'),
  }

  const result = ResetPasswordSchema.safeParse(raw)
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? '入力内容を確認してください'
    return { error: firstError, success: false }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  if (error) {
    return { error: 'パスワードリセットメールの送信に失敗しました', success: false }
  }

  return { error: null, success: true }
}
