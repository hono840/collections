'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import * as z from 'zod'
import { actionError, actionOk, type ActionResult } from '@/lib/actions/result'
import { NEXT_PATH_COOKIE, NEXT_PATH_COOKIE_MAX_AGE_SECONDS } from '@/lib/auth/next-path-cookie'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/utils/safe-next-path'
import { magicLinkSchema, verifyOtpSchema } from '@/lib/validation/auth'

const RETRY_LATER_MESSAGE = '時間をおいてもう一度お試しください'
const VALIDATION_MESSAGE = '入力内容を確認してください'
const INVALID_CODE_MESSAGE = 'コードが正しくないか、有効期限が切れています。もう一度お試しください。'

// Errors GoTrue returns for an address that has no account while signups are disabled.
// They are reported as success so the form never reveals whether an account exists.
const UNKNOWN_USER_ERROR_CODES = new Set(['otp_disabled', 'user_not_found', 'signup_disabled'])
const RATE_LIMIT_ERROR_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit'])

type AuthErrorLike = { status?: number; code?: string; message?: string }

export type RequestMagicLinkState = ActionResult<{ email: string }> | null
export type VerifyOtpCodeState = ActionResult<never> | null

function isRateLimited(error: AuthErrorLike): boolean {
  return error.status === 429 || (error.code !== undefined && RATE_LIMIT_ERROR_CODES.has(error.code))
}

function isUnknownUser(error: AuthErrorLike): boolean {
  if (error.code !== undefined && UNKNOWN_USER_ERROR_CODES.has(error.code)) return true
  return /signups not allowed/i.test(error.message ?? '')
}

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

/** Origin the magic link returns to. Preview deployments fall back to VERCEL_URL. */
function siteOrigin(): string | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (siteUrl) return siteUrl.replace(/\/+$/, '')
  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl}`
  return undefined // Supabase falls back to the project's Site URL
}

export async function requestMagicLink(
  _previousState: RequestMagicLinkState,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  const parsed = magicLinkSchema.safeParse({
    email: formString(formData, 'email') ?? '',
    next: formString(formData, 'next'),
  })
  if (!parsed.success) {
    return actionError('validation', VALIDATION_MESSAGE, z.flattenError(parsed.error).fieldErrors)
  }
  const { email, next } = parsed.data

  const cookieStore = await cookies()
  cookieStore.set(NEXT_PATH_COOKIE, safeNextPath(next), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: NEXT_PATH_COOKIE_MAX_AGE_SECONDS,
  })

  const supabase = await createClient()
  const emailRedirectTo = siteOrigin()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Sign-up is closed (CEO decision 15.1-2): never create accounts from the login form.
      shouldCreateUser: false,
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  })

  if (error) {
    if (isRateLimited(error)) return actionError('rate_limited', RETRY_LATER_MESSAGE)
    if (!isUnknownUser(error)) return actionError('unexpected', RETRY_LATER_MESSAGE)
  }
  return actionOk({ email })
}

export async function verifyOtpCode(
  _previousState: VerifyOtpCodeState,
  formData: FormData,
): Promise<ActionResult<never>> {
  const parsed = verifyOtpSchema.safeParse({
    email: formString(formData, 'email') ?? '',
    token: formString(formData, 'token') ?? '',
  })
  if (!parsed.success) {
    return actionError('validation', VALIDATION_MESSAGE, z.flattenError(parsed.error).fieldErrors)
  }
  const { email, token } = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) {
    if (isRateLimited(error)) return actionError('rate_limited', RETRY_LATER_MESSAGE)
    if (error.status !== undefined && error.status >= 500) {
      return actionError('unexpected', RETRY_LATER_MESSAGE)
    }
    return actionError('validation', INVALID_CODE_MESSAGE)
  }

  const cookieStore = await cookies()
  const nextPath = safeNextPath(cookieStore.get(NEXT_PATH_COOKIE)?.value)
  cookieStore.delete(NEXT_PATH_COOKIE)
  // redirect() throws; it must stay outside any try/catch.
  redirect(nextPath)
}

export async function signOut(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
