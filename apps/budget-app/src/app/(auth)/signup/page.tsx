'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { signup } from './actions'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      return await signup(formData)
    },
    null
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">アカウント作成</h2>
        <p className="mt-1 text-sm text-gray-500">
          新しいアカウントを作成してください
        </p>
      </div>

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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={cn(
              'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
              'transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
            )}
            placeholder="8文字以上"
          />
          <p className="mt-1 text-xs text-gray-400">8文字以上で入力してください</p>
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
          {isPending ? '作成中...' : 'アカウントを作成'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        すでにアカウントをお持ちの方は{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-600 hover:text-brand-500"
        >
          ログイン
        </Link>
      </p>
    </div>
  )
}
