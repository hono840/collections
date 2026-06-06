import type { Metadata } from 'next'
import { ListDetailTemplate } from '@/components/templates/ListDetailTemplate'
import { RuleLessonCard } from '@/components/molecules/RuleLessonCard'
import { getRepository } from '@/lib/data'

export const metadata: Metadata = {
  title: 'ルール図鑑',
  description:
    'オフサイドやVAR、PK戦まで。サッカーのルールを初心者向けにやさしく解説。オフサイドはドラッグで体験もできます。',
}

/**
 * ルール図鑑トップ。レッスン一覧（order 昇順）をカードで並べ、各詳細へ遷移する。
 * Server Component（getRuleLessons でデータ取得）。
 */
export default async function RulesPage() {
  const lessons = await getRepository().getRuleLessons()
  const sorted = [...lessons].sort((a, b) => a.order - b.order)

  return (
    <ListDetailTemplate
      title="ルール図鑑"
      description="観るのに最低限知っておきたいルールを、やさしく1本ずつ。"
    >
      {sorted.map((lesson) => (
        <RuleLessonCard
          key={lesson.slug}
          titleJa={lesson.titleJa}
          estimatedMinutes={lesson.estimatedMinutes}
          href={`/rules/${lesson.slug}`}
        />
      ))}
    </ListDetailTemplate>
  )
}
