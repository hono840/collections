import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import {
  INVALID_EMAIL_MESSAGE,
  INVALID_OTP_FORMAT_MESSAGE,
  magicLinkSchema,
  otpCodeSchema,
  verifyOtpSchema,
} from './auth'

describe('magicLinkSchema', () => {
  it('accepts a valid email address', () => {
    const result = magicLinkSchema.safeParse({ email: 'hiro@example.com' })
    expect(result.success).toBe(true)
    expect(result.data?.email).toBe('hiro@example.com')
  })

  it('trims surrounding spaces before validating (mobile keyboards add them)', () => {
    const result = magicLinkSchema.safeParse({ email: '  hiro@example.com  ' })
    expect(result.success).toBe(true)
    expect(result.data?.email).toBe('hiro@example.com')
  })

  it('keeps an optional next value as-is (sanitized later by safeNextPath)', () => {
    const result = magicLinkSchema.safeParse({ email: 'hiro@example.com', next: '/roads/abc' })
    expect(result.success).toBe(true)
    expect(result.data?.next).toBe('/roads/abc')
  })

  it.each(['', 'hiro', 'hiro@', '@example.com', 'hiro@example', 'hiro example@example.com'])(
    'rejects an invalid email %j with the M-21 message',
    (email) => {
      const result = magicLinkSchema.safeParse({ email })
      expect(result.success).toBe(false)
      if (result.success) return
      expect(z.flattenError(result.error).fieldErrors.email).toEqual([INVALID_EMAIL_MESSAGE])
    },
  )

  it('uses the exact Japanese copy for the invalid email message', () => {
    expect(INVALID_EMAIL_MESSAGE).toBe('メールアドレスの形式が正しくありません')
  })
})

describe('otpCodeSchema', () => {
  it('accepts exactly 6 ASCII digits', () => {
    expect(otpCodeSchema.safeParse('123456').success).toBe(true)
    expect(otpCodeSchema.safeParse('000000').success).toBe(true)
  })

  it.each([
    '',
    '12345',
    '1234567',
    '12a456',
    '12 456',
    ' 123456',
    '123456 ',
    '１２３４５６',
    '-12345',
    '12345.',
    '123456\n',
  ])('rejects %j', (token) => {
    const result = otpCodeSchema.safeParse(token)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0]?.message).toBe(INVALID_OTP_FORMAT_MESSAGE)
  })

  it('rejects non-string values', () => {
    expect(otpCodeSchema.safeParse(123456).success).toBe(false)
    expect(otpCodeSchema.safeParse(null).success).toBe(false)
  })

  it('uses the exact Japanese copy for the format message', () => {
    expect(INVALID_OTP_FORMAT_MESSAGE).toBe('6桁の数字を入力してください')
  })
})

describe('verifyOtpSchema', () => {
  it('accepts email + 6-digit token', () => {
    const result = verifyOtpSchema.safeParse({ email: 'hiro@example.com', token: '123456' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: 'hiro@example.com', token: '123456' })
  })

  it('reports field errors for both email and token', () => {
    const result = verifyOtpSchema.safeParse({ email: 'nope', token: '12' })
    expect(result.success).toBe(false)
    if (result.success) return
    const fieldErrors = z.flattenError(result.error).fieldErrors
    expect(fieldErrors.email).toEqual([INVALID_EMAIL_MESSAGE])
    expect(fieldErrors.token).toEqual([INVALID_OTP_FORMAT_MESSAGE])
  })
})
