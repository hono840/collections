'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignupSchema } from '@/lib/validations/auth'

export async function signup(formData: FormData) {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const result = SignupSchema.safeParse(raw)
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? '入力内容を確認してください'
    return { error: firstError }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    console.error('Signup error:', error.message, error.status)
    return { error: `アカウントの作成に失敗しました: ${error.message}` }
  }

  redirect('/dashboard')
}
