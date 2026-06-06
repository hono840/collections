import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ListDetailTemplate } from '@/components/templates/ListDetailTemplate'
import { RuleLessonViewer } from '@/components/organisms/RuleLessonViewer'
import { getRepository } from '@/lib/data'

/** generateStaticParams で全 slug を静的生成し、未定義は 404 に倒す */
export const dynamicParams = false

type RuleDetailPageProps = {
  params: Promise<{ slug: string }>
}

/** 全レッスンの slug をビルド時に列挙 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const lessons = await getRepository().getRuleLessons()
  return lessons.map((lesson) => ({ slug: lesson.slug }))
}

/** レッスン名をタイトル/説明に反映 */
export async function generateMetadata({
  params,
}: RuleDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const lesson = await getRepository().getRuleLesson(slug)
  if (!lesson) {
    return { title: 'ルールが見つかりません' }
  }
  const firstParagraph = lesson.bodyBlocks.find(
    (block) => block.type === 'paragraph',
  )
  return {
    title: lesson.titleJa,
    description:
      firstParagraph?.type === 'paragraph'
        ? firstParagraph.text
        : `${lesson.titleJa}を初心者向けにやさしく解説します。`,
  }
}

/**
 * ルールレッスン詳細。RuleLessonViewer で本文を整形表示し、
 * interactive==='offside-sim' のとき OffsideSimulator を埋め込む。
 * 関連用語は用語じてんへのリンクとして表示する。
 * Server Component（params は Promise → await）。
 */
export default async function RuleDetailPage({ params }: RuleDetailPageProps) {
  const { slug } = await params
  const repo = getRepository()
  const lesson = await repo.getRuleLesson(slug)

  if (!lesson) {
    notFound()
  }

  // 関連用語スラッグ → Term へ解決（用語じてんへのリンク表示用）
  const allTerms = await repo.getTerms()
  const relatedTerms = lesson.relatedTermSlugs
    .map((termSlug) => allTerms.find((t) => t.slug === termSlug))
    .filter((t): t is NonNullable<typeof t> => t != null)
    .map((t) => ({ slug: t.slug, termJa: t.termJa }))

  return (
    <ListDetailTemplate>
      <Link
        href="/rules"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-bold text-pitch-700 hover:text-pitch-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        ルール図鑑へ戻る
      </Link>
      <RuleLessonViewer
        titleJa={lesson.titleJa}
        estimatedMinutes={lesson.estimatedMinutes}
        bodyBlocks={lesson.bodyBlocks}
        interactive={lesson.interactive}
        relatedTerms={relatedTerms}
      />
    </ListDetailTemplate>
  )
}
