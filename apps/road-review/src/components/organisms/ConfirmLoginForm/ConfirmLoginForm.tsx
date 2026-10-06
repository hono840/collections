'use client'

import { useActionState } from 'react'
import { Button } from '@/components/atoms/Button'
import { confirmMagicLink } from '@/features/auth/actions'
import { cn } from '@/lib/utils/cn'

export type ConfirmLoginFormProps = {
  /** token_hash from the magic link (sent as a hidden field, never shown). */
  tokenHash: string
  className?: string
}

/**
 * "ログインする" on /auth/confirm (S-6). The token is consumed only when the
 * user presses the button, so mail scanners that prefetch the link and
 * login-CSRF links cannot sign anyone in. confirmMagicLink always redirects:
 * to the saved `next` path on success, to /login?error=link_invalid otherwise.
 * Without JS the form still posts to the server action.
 */
export function ConfirmLoginForm({ tokenHash, className }: ConfirmLoginFormProps) {
  const [, formAction, isPending] = useActionState(confirmMagicLink, null)

  return (
    <form action={formAction} className={cn('space-y-4', className)}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <Button type="submit" className="w-full" loading={isPending}>
        {isPending ? 'ログイン中…' : 'ログインする'}
      </Button>
    </form>
  )
}
