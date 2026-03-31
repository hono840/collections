import { describe, it, expect } from 'vitest'
import { LoginSchema, SignupSchema } from '@/lib/validations/auth'

describe('LoginSchema', () => {
  const validData = {
    email: 'user@example.com',
    password: 'password123',
  }

  // --- 正常系 ---

  it('有効なデータがバリデーションを通過する', () => {
    const result = LoginSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('パスワードがちょうど 8文字でも通過する', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      password: '12345678',
    })
    expect(result.success).toBe(true)
  })

  // --- 異常系: email ---

  it('email が空文字の場合はエラー', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      email: '',
    })
    expect(result.success).toBe(false)
  })

  it('email が不正な形式の場合はエラー', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      email: 'invalid-email',
    })
    expect(result.success).toBe(false)
  })

  it('email に @ がない場合はエラー', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      email: 'userexample.com',
    })
    expect(result.success).toBe(false)
  })

  // --- 異常系: password ---

  it('パスワードが 7文字以下の場合はエラー', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      password: '1234567',
    })
    expect(result.success).toBe(false)
  })

  it('パスワードが空文字の場合はエラー', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      password: '',
    })
    expect(result.success).toBe(false)
  })

  // --- エラーメッセージ ---

  it('不正なメールアドレスで日本語エラーメッセージが返る', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      email: 'invalid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === 'email')
      expect(emailError?.message).toBe('有効なメールアドレスを入力してください')
    }
  })

  it('短いパスワードで日本語エラーメッセージが返る', () => {
    const result = LoginSchema.safeParse({
      ...validData,
      password: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwError = result.error.issues.find((i) => i.path[0] === 'password')
      expect(pwError?.message).toBe('パスワードは8文字以上で入力してください')
    }
  })
})

describe('SignupSchema', () => {
  const validData = {
    email: 'newuser@example.com',
    password: 'securepassword',
  }

  it('有効なデータがバリデーションを通過する', () => {
    const result = SignupSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('不正なメールアドレスはエラー', () => {
    const result = SignupSchema.safeParse({
      ...validData,
      email: 'bad-email',
    })
    expect(result.success).toBe(false)
  })

  it('短いパスワードはエラー', () => {
    const result = SignupSchema.safeParse({
      ...validData,
      password: '1234',
    })
    expect(result.success).toBe(false)
  })
})
