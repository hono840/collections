import { describe, it, expect } from 'vitest'
import { CreateTransactionSchema } from '@/lib/validations/transaction'

describe('CreateTransactionSchema', () => {
  const validData = {
    amount: 1000,
    categoryId: '123e4567-e89b-12d3-a456-426614174000',
    date: '2024-03-15',
    note: 'ランチ代',
    type: 'expense' as const,
  }

  // --- 正常系 ---

  it('有効なデータがバリデーションを通過する', () => {
    const result = CreateTransactionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('note が空文字でもバリデーションを通過する', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      note: '',
    })
    expect(result.success).toBe(true)
  })

  it('note が省略されてもバリデーションを通過する', () => {
    const { note: _, ...dataWithoutNote } = validData
    const result = CreateTransactionSchema.safeParse(dataWithoutNote)
    expect(result.success).toBe(true)
  })

  it('type が income でもバリデーションを通過する', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      type: 'income',
    })
    expect(result.success).toBe(true)
  })

  it('amount が文字列でも coerce で数値に変換される', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      amount: '500',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe(500)
    }
  })

  // --- 異常系: amount ---

  it('amount が 0 の場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('amount が負の場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('amount が小数の場合はエラー (整数のみ)', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      amount: 10.5,
    })
    expect(result.success).toBe(false)
  })

  // --- 異常系: categoryId ---

  it('categoryId が不正な UUID の場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      categoryId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('categoryId が空文字の場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      categoryId: '',
    })
    expect(result.success).toBe(false)
  })

  // --- 異常系: date ---

  it('date が不正な形式の場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      date: '2024/03/15',
    })
    expect(result.success).toBe(false)
  })

  it('date が空文字の場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      date: '',
    })
    expect(result.success).toBe(false)
  })

  // --- 異常系: note ---

  it('note が 200文字を超える場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      note: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  // --- 異常系: type ---

  it('type が不正な値の場合はエラー', () => {
    const result = CreateTransactionSchema.safeParse({
      ...validData,
      type: 'transfer',
    })
    expect(result.success).toBe(false)
  })
})
