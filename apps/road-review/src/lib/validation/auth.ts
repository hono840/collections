import * as z from 'zod'

export const INVALID_EMAIL_MESSAGE = 'メールアドレスの形式が正しくありません'
export const INVALID_OTP_FORMAT_MESSAGE = '6桁の数字を入力してください'

// Trim first, then validate: z.email().trim() would validate the padded value and reject it.
export const emailSchema = z
  .string({ error: INVALID_EMAIL_MESSAGE })
  .trim()
  .pipe(z.email({ error: INVALID_EMAIL_MESSAGE }))

// Exactly 6 ASCII digits. No trimming: the OTP field only accepts digits.
export const otpCodeSchema = z
  .string({ error: INVALID_OTP_FORMAT_MESSAGE })
  .regex(/^[0-9]{6}$/, { error: INVALID_OTP_FORMAT_MESSAGE })

export const magicLinkSchema = z.object({
  email: emailSchema,
  // Sanitized later by safeNextPath (open-redirect protection).
  next: z.string().optional(),
})
export type MagicLinkInput = z.input<typeof magicLinkSchema>

export const verifyOtpSchema = z.object({
  email: emailSchema,
  token: otpCodeSchema,
})
export type VerifyOtpInput = z.input<typeof verifyOtpSchema>
