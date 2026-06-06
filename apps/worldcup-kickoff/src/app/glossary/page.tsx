import type { Metadata } from 'next'
import { DefaultTemplate } from '@/components/templates/DefaultTemplate'
import { GlossaryList } from '@/components/organisms/GlossaryList'
import { getRepository } from '@/lib/data'

export const metadata: Metadata = {
  title: '用語じてん',
  description:
    'オフサイド、ハットトリック、ボランチ…サッカー観戦でよく出る用語を、初心者向けにやさしく解説。検索とカテゴリ絞り込みで知りたい言葉がすぐ見つかります。',
}

/**
 * 用語じてん。全用語を取得し、検索＋カテゴリ絞り込み可能な一覧（GlossaryList）に渡す。
 * Server Component（getTerms でデータ取得 → Client へシリアライズ可能な配列を渡す）。
 */
export default async function GlossaryPage() {
  const terms = await getRepository().getTerms()
  const sorted = [...terms].sort((a, b) =>
    a.termJa.localeCompare(b.termJa, 'ja'),
  )

  return (
    <DefaultTemplate
      title="用語じてん"
      description="観戦でよく聞く言葉を、わかりやすく。気になる用語を探してみましょう。"
    >
      <GlossaryList terms={sorted} />
    </DefaultTemplate>
  )
}
