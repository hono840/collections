'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { Alert } from '@/components/atoms/Alert'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Label } from '@/components/atoms/Label'
import { verifyOtpCode } from '@/features/auth/actions'
import { cn } from '@/lib/utils/cn'

const SIX_DIGITS = /^\d{6}$/
const RETRY_LATER_MESSAGE = '時間をおいてもう一度お試しください'

export type OtpFormProps = {
  /** Address the code was sent to (sent along with the token). */
  email: string
  className?: string
}

/**
 * 6-digit code entry shown on the login screen after the email is sent
 * (CEO decision 15.1-3). On success the server action redirects.
 *
 * The action is called from the submit handler with plain state instead of
 * useActionState/startTransition: React batches every pending async transition
 * together, so one verification that never settles (e.g. a redirect in flight)
 * would keep later results from rendering. This also keeps the typed code
 * (no automatic form reset).
 */
export function OtpForm({ email, className }: OtpFormProps) {
  const [token, setToken] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inFlight = useRef(false)
  const tokenId = useId()
  const hintId = `${tokenId}-hint`

  const isComplete = SIX_DIGITS.test(token)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || inFlight.current) return
    inFlight.current = true
    setIsPending(true)
    setErrorMessage(null)
    const formData = new FormData(event.currentTarget)
    try {
      const result = await verifyOtpCode(null, formData)
      // Success redirects on the server, so stay busy while navigating.
      if (result && !result.ok) fail(result.error.message)
    } catch {
      fail(RETRY_LATER_MESSAGE)
    }
  }

  function fail(message: string) {
    setErrorMessage(message)
    inFlight.current = false
    setIsPending(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={cn('space-y-4', className)}>
      <input type="hidden" name="email" value={email} />

      {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

      <div>
        <Label htmlFor={tokenId}>6桁のコード</Label>
        <p id={hintId} className="mt-1 text-sm text-ink-muted">
          メールに書かれた6桁の数字を入力してください。
        </p>
        <Input
          id={tokenId}
          name="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          invalid={errorMessage !== null}
          aria-describedby={hintId}
          className="num mt-1.5 max-w-48 text-center text-lg tracking-widest"
        />
      </div>

      <Button type="submit" className="w-full" disabled={!isComplete} loading={isPending}>
        {isPending ? '確認中…' : 'ログインする'}
      </Button>
    </form>
  )
}
