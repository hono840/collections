import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/atoms/EmptyState'

/**
 * ルールレッスンが見つからない場合（dynamicParams=false で未定義 slug は 404）。
 * Server Component。
 */
export default function RuleNotFound() {
  return (
    <EmptyState
      icon={<BookOpen className="h-10 w-10" />}
      title="ルールが見つかりませんでした"
      description="お探しのルール解説は存在しないか、移動した可能性があります。"
      action={
        <Link
          href="/rules"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-pitch-600 px-5 text-sm font-bold text-white hover:bg-pitch-700"
        >
          ルール図鑑へ戻る
        </Link>
      }
    />
  )
}
