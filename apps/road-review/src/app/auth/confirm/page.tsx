import type { Metadata } from 'next'
import Link from 'next/link'
import { Alert } from '@/components/atoms/Alert'
import { ConfirmLoginForm } from '@/components/organisms/ConfirmLoginForm'
import { AuthTemplate } from '@/components/templates/AuthTemplate'

export const metadata: Metadata = {
  title: 'ログインを確認',
}

// M-23
const LINK_INVALID_MESSAGE =
  'ログインリンクの有効期限が切れているか、すでに使われています。もう一度メールアドレスを入力してください。'

// M-29
const POLICY_FOOTER = '法律の範囲内で楽しむための記録帳です。速度やタイムは扱いません。'

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.at(0) : value
}

/**
 * Magic-link landing (S-6). Email template:
 * {{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * GET only shows this screen and never touches Supabase; the token is
 * verified by the confirmMagicLink server action when "ログインする" is pressed.
 */
export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams
  const tokenHash = firstValue(params.token_hash)?.trim()
  const isValidLink = Boolean(tokenHash) && firstValue(params.type) === 'email'

  if (!tokenHash || !isValidLink) {
    return (
      <AuthTemplate title="ログインリンクを確認できません" footer={POLICY_FOOTER}>
        <div className="space-y-6">
          <Alert variant="error">{LINK_INVALID_MESSAGE}</Alert>
          <Link
            href="/login"
            className="relative inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-transparent bg-primary px-5 text-base font-bold text-on-primary transition-colors duration-140 ease-standard hover:bg-primary-hover active:bg-primary-active"
          >
            もう一度リンクを送る
          </Link>
        </div>
      </AuthTemplate>
    )
  }

  return (
    <AuthTemplate
      title="ログインを確認"
      description="下のボタンを押すと、このブラウザでログインします。"
      footer={POLICY_FOOTER}
    >
      <ConfirmLoginForm tokenHash={tokenHash} />
    </AuthTemplate>
  )
}
