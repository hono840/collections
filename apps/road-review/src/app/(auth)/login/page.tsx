import type { Metadata } from 'next'
import { LoginForm } from '@/components/organisms/LoginForm'
import { AuthTemplate } from '@/components/templates/AuthTemplate'

export const metadata: Metadata = {
  title: 'ログイン',
}

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.at(0) : value
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  // `next` is sanitized again on the server (safeNextPath) before any redirect.
  const next = firstValue(params.next)
  const initialError = firstValue(params.error) === 'link_invalid' ? 'link_invalid' : undefined

  return (
    <AuthTemplate
      title="ログイン"
      description="メールアドレスにログイン用のメールを送ります。"
      // M-29
      footer="法律の範囲内で楽しむための記録帳です。速度やタイムは扱いません。"
    >
      <LoginForm next={next} initialError={initialError} />
    </AuthTemplate>
  )
}
