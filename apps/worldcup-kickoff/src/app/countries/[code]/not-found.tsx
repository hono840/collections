import Link from 'next/link'
import { Globe } from 'lucide-react'
import { EmptyState } from '@/components/atoms/EmptyState'

/**
 * 国詳細の 404。dynamicParams=false により未定義の国コードはここに倒れる。
 */
export default function CountryNotFound() {
  return (
    <div className="py-8">
      <EmptyState
        icon={<Globe className="h-10 w-10" aria-hidden />}
        title="この国は見つかりませんでした"
        description="出場48ヶ国の中にないコードかもしれません。国図鑑から探してみてください。"
        action={
          <Link
            href="/countries"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pitch-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pitch-700"
          >
            国図鑑へもどる
          </Link>
        }
      />
    </div>
  )
}
