import { z } from 'zod/v4'

export const CreateTransactionSchema = z.object({
  amount: z.coerce.number().int().positive('金額は1以上で入力してください'),
  categoryId: z.string().uuid('カテゴリを選択してください'),
  date: z.string().date(),
  note: z.string().max(200).optional().default(''),
  type: z.enum(['expense', 'income']).default('expense'),
})

export const UpdateTransactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().int().positive('金額は1以上で入力してください'),
  categoryId: z.string().uuid('カテゴリを選択してください'),
  date: z.string().date(),
  note: z.string().max(200).optional().default(''),
  type: z.enum(['expense', 'income']).default('expense'),
})

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>
