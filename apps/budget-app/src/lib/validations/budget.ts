import { z } from 'zod/v4'

export const UpsertBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce.number().int().min(0, '予算は0以上で入力してください'),
  month: z.string().date(),
})

export type UpsertBudgetInput = z.infer<typeof UpsertBudgetSchema>
