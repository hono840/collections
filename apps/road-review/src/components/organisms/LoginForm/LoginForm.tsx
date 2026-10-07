'use client'

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Alert } from '@/components/atoms/Alert'
import { Button } from '@/components/atoms/Button'
import { FieldError } from '@/components/atoms/FieldError'
import { Input } from '@/components/atoms/Input'
import { Label } from '@/components/atoms/Label'
import { requestMagicLink, type RequestMagicLinkState } from '@/features/auth/actions'
import { cn } from '@/lib/utils/cn'

// M-23
const LINK_INVALID_MESSAGE =
  'ログインリンクの有効期限が切れているか、すでに使われています。もう一度メールアドレスを入力してください。'

export type LoginFormProps = {
  /** Path to return to after login (sanitized again on the server). */
  next?: string
  /** Set when /auth/confirm sent the user back with ?error=link_invalid. */
  initialError?: 'link_invalid'
  className?: string
}

/**
 * Login screen body (S-01): email -> "send login link", then the sent message.
 * Login uses Supabase's default Magic Link + PKCE (ch.21), so the link must be
 * opened in this same browser. The 6-digit code form (OtpForm) is hidden until
 * custom SMTP is introduced.
 */
export function LoginForm({ next, initialError, className }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<RequestMagicLinkState, FormData>(
    requestMagicLink,
    null,
  )
  // The result the user dismissed with "メールアドレスを変更".
  const [dismissedState, setDismissedState] = useState<RequestMagicLinkState>(null)
  const emailId = useId()
  const hintId = `${emailId}-hint`
  const errorId = `${emailId}-error`
  const sentHeadingRef = useRef<HTMLParagraphElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  // Set by "メールアドレスを変更": the email field takes focus once it is back.
  const shouldFocusEmail = useRef(false)

  const sentEmail = state?.ok && state !== dismissedState ? state.data.email : null
  const emailFieldError =
    state && !state.ok ? state.error.fieldErrors?.email?.[0] : undefined
  const formErrorMessage =
    state && !state.ok
      ? emailFieldError
        ? null
        : state.error.message
      : state === null && initialError === 'link_invalid'
        ? LINK_INVALID_MESSAGE
        : null

  useEffect(() => {
    if (sentEmail) {
      sentHeadingRef.current?.focus()
    } else if (shouldFocusEmail.current) {
      shouldFocusEmail.current = false
      emailInputRef.current?.focus()
    }
  }, [sentEmail])

  function handleChangeEmail() {
    shouldFocusEmail.current = true
    setDismissedState(state)
  }

  // Dispatch manually so React does not reset the form after the action:
  // on errors (e.g. rate_limited) the typed address must stay in the field.
  // Without JS the `action` attribute still posts the form.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return
    const formData = new FormData(event.currentTarget)
    startTransition(() => formAction(formData))
  }

  if (sentEmail) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="space-y-2">
          <p
            ref={sentHeadingRef}
            tabIndex={-1}
            role="status"
            className="text-base font-bold text-ink focus-visible:outline-offset-4"
          >
            {sentEmail} にログイン用のメールを送りました。
          </p>
          <p className="text-sm text-ink-muted">
            メールのリンクは、このブラウザで開いてください。別の端末やアプリで開くとログインできません。
          </p>
          <p className="text-sm text-ink-muted">
            メールが見当たらないときは、迷惑メールのフォルダも確認してください。届かない場合は60秒後にもう一度お試しください。
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={handleChangeEmail}
        >
          メールアドレスを変更
        </Button>
      </div>
    )
  }

  const describedBy = [hintId, emailFieldError ? errorId : null].filter(Boolean).join(' ')

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className={cn('space-y-5', className)}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {formErrorMessage ? <Alert variant="error">{formErrorMessage}</Alert> : null}

      <div>
        <Label htmlFor={emailId}>メールアドレス</Label>
        <Input
          ref={emailInputRef}
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          defaultValue={state === dismissedState && state?.ok ? state.data.email : undefined}
          invalid={Boolean(emailFieldError)}
          aria-describedby={describedBy}
          className="mt-1.5"
        />
        <FieldError id={errorId}>{emailFieldError}</FieldError>
        {/* M-02 */}
        <p id={hintId} className="mt-2 text-sm text-ink-muted">
          パスワードは不要です。届いたリンクを開くとログインできます。
        </p>
      </div>

      <Button type="submit" className="w-full" loading={isPending}>
        {isPending ? '送信中…' : 'ログインリンクを送る'}
      </Button>
    </form>
  )
}
