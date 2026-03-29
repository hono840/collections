'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { resetPassword } from './actions'

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(
    async (
      _prev: { error: string | null; success: boolean } | null,
      formData: FormData
    ) => {
      return await resetPassword(formData)
    },
    null
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">パスワードをリセット</h2>
        <p className="mt-1 text-sm text-gray-500">
          登録済みのメールアドレスを入力してください。リセット用のリンクをお送りします。
        </p>
      </div>

      {state?.success ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
            パスワードリセット用のメールを送信しました。メールをご確認ください。
          </div>
          <Link
            href="/login"
            className={cn(
              'block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-700',
              'transition-colors hover:bg-gray-50'
            )}
          >
            ログインに戻る
          </Link>
        </div>
      ) : (
        <>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={cn(
                  'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
                  'transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
                )}
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm',
                'transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {isPending ? '送信中...' : 'リセットメールを送信'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            <Link
              href="/login"
              className="font-semibold text-brand-600 hover:text-brand-500"
            >
              ログインに戻る
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
