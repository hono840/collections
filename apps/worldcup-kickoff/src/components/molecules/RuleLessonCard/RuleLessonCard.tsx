import Link from 'next/link'
import { BookOpen, ChevronRight, Clock, Check } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { cn } from '@/lib/utils/cn'

export interface RuleLessonCardProps {
  /** レッスンタイトル */
  titleJa: string
  /** 所要目安（分） */
  estimatedMinutes: number
  /** リンク先（/rules/[slug]）。指定すると Link になる */
  href?: string
  /** 学習済みフラグ（チェック表示） */
  completed?: boolean
  /** 先頭アイコン（既定: BookOpen） */
  icon?: React.ReactNode
  /** 補足説明（任意） */
  description?: string
  className?: string
}

function CardBody({
  titleJa,
  estimatedMinutes,
  completed,
  icon,
  description,
  showChevron,
}: Pick<
  RuleLessonCardProps,
  'titleJa' | 'estimatedMinutes' | 'completed' | 'icon' | 'description'
> & { showChevron: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          completed ? 'bg-pitch-100 text-pitch-700' : 'bg-pitch-50 text-pitch-600',
        )}
        aria-hidden
      >
        {icon ?? <BookOpen className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-text">
          <span className="truncate">{titleJa}</span>
          {completed ? (
            <Check className="h-4 w-4 shrink-0 text-pitch-600" aria-hidden />
          ) : null}
        </p>
        {description ? (
          <p className="line-clamp-1 text-xs text-text-muted">{description}</p>
        ) : null}
        <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          約{estimatedMinutes}分
          {completed ? <span className="ml-1 text-pitch-600">学習済み</span> : null}
        </p>
      </div>
      {showChevron ? (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-text-muted"
          aria-hidden
        />
      ) : null}
    </div>
  )
}

/**
 * ルール一覧の1カード（タイトル・所要分・アイコン・学習済み表示）。
 * `href` を渡すと `next/link` でレッスン詳細へ遷移するタップ可能カードになる。
 * Server Component。
 */
export function RuleLessonCard({
  titleJa,
  estimatedMinutes,
  href,
  completed = false,
  icon,
  description,
  className,
}: RuleLessonCardProps) {
  const body = (
    <CardBody
      titleJa={titleJa}
      estimatedMinutes={estimatedMinutes}
      completed={completed}
      icon={icon}
      description={description}
      showChevron={Boolean(href)}
    />
  )

  if (href) {
    return (
      <Link href={href} className={cn('block', className)}>
        <Card interactive>{body}</Card>
      </Link>
    )
  }

  return <Card className={className}>{body}</Card>
}
