import Link from 'next/link'
import { Clock, Info, Lightbulb, ChevronRight, BookMarked } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { OffsideSimulator } from '@/components/organisms/OffsideSimulator'
import { cn } from '@/lib/utils/cn'
import type { RuleBlock, Term } from '@/lib/domain'

export interface RuleLessonViewerProps {
  /** レッスンタイトル */
  titleJa: string
  /** 所要目安（分） */
  estimatedMinutes: number
  /** 本文ブロック */
  bodyBlocks: RuleBlock[]
  /** 埋め込むインタラクティブ要素 */
  interactive?: 'offside-sim' | null
  /** 関連用語（用語じてんへのリンク用。slug + 表示名） */
  relatedTerms?: Pick<Term, 'slug' | 'termJa'>[]
  className?: string
}

/** 1ブロックを描画（heading/paragraph/list/callout） */
function BlockRenderer({ block }: { block: RuleBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="mt-2 text-lg font-bold text-text">{block.text}</h2>
      )
    case 'paragraph':
      return (
        <p className="text-sm leading-relaxed text-text-muted">{block.text}</p>
      )
    case 'list':
      return (
        <ul className="flex flex-col gap-1.5">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed text-text-muted"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pitch-400"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'callout': {
      const isTip = block.tone === 'tip'
      return (
        <Card
          padding="sm"
          className={cn(
            'border-l-4',
            isTip
              ? 'border-l-gold-400 bg-gold-50'
              : 'border-l-pitch-400 bg-pitch-50',
          )}
        >
          <div className="flex gap-2">
            {isTip ? (
              <Lightbulb
                className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
                aria-hidden
              />
            ) : (
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-pitch-600"
                aria-hidden
              />
            )}
            <p className="text-sm leading-relaxed text-text">{block.text}</p>
          </div>
        </Card>
      )
    }
    default:
      return null
  }
}

/**
 * ルールレッスンの本文ビューア。bodyBlocks（heading/paragraph/list/callout）を
 * 整形表示し、interactive==='offside-sim' のとき OffsideSimulator を埋め込む。
 * 関連用語は用語じてんへのリンクとして列挙する。
 * Server Component（OffsideSimulator のみ Client）。
 */
export function RuleLessonViewer({
  titleJa,
  estimatedMinutes,
  bodyBlocks,
  interactive,
  relatedTerms = [],
  className,
}: RuleLessonViewerProps) {
  return (
    <article className={cn('flex flex-col gap-4', className)}>
      <header className="flex flex-col gap-2">
        <Badge variant="pitch">ルール図鑑</Badge>
        <h1 className="text-2xl font-extrabold text-text">{titleJa}</h1>
        <p className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          約{estimatedMinutes}分で読めます
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {bodyBlocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>

      {interactive === 'offside-sim' ? (
        <Card padding="md" className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-text">
            やってみよう：オフサイド体験
          </h2>
          <OffsideSimulator />
        </Card>
      ) : null}

      {relatedTerms.length > 0 ? (
        <section className="flex flex-col gap-2" aria-labelledby="related-terms">
          <h2
            id="related-terms"
            className="flex items-center gap-1.5 text-sm font-bold text-text"
          >
            <BookMarked className="h-4 w-4 shrink-0 text-pitch-600" aria-hidden />
            関連用語
          </h2>
          <ul className="flex flex-col gap-2">
            {relatedTerms.map((term) => (
              <li key={term.slug}>
                <Link
                  href={`/glossary#${term.slug}`}
                  className="block"
                >
                  <Card interactive padding="sm">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-text">
                        {term.termJa}
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-text-muted"
                        aria-hidden
                      />
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
