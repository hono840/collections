import { z } from 'zod/v4'

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'カテゴリ名を入力してください').max(30),
  icon: z.string().default('circle'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '有効なカラーコードを入力してください'),
})

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'カテゴリ名を入力してください').max(30),
  icon: z.string().default('circle'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '有効なカラーコードを入力してください'),
})

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
