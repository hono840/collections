import { z } from 'zod/v4'

export const LoginSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

export const SignupSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

export const ResetPasswordSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type SignupInput = z.infer<typeof SignupSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
