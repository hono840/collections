import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/atoms/Card'
import { cn } from '@/lib/utils/cn'

/** タイルのアクセント色（アイコン背景・前景に反映） */
export type FeatureTileTone = 'pitch' | 'gold' | 'kickoff'

export interface FeatureTileProps {
  /** 遷移先パス（例: "/matches"） */
  href: string
  /** lucide アイコン（個別 import したコンポーネントを渡す） */
  icon: LucideIcon
  /** タイトル（日本語ラベル） */
  label: string
  /** 一言説明（初心者向け補足） */
  description: string
  /** アクセント色 */
  tone?: FeatureTileTone
  className?: string
}

const toneStyles: Record<FeatureTileTone, string> = {
  pitch: 'bg-pitch-100 text-pitch-700',
  gold: 'bg-gold-100 text-gold-700',
  kickoff: 'bg-kickoff-100 text-kickoff-700',
}

/**
 * ホームの統合ハブを構成する 1 タイル。
 * 機能ページへの Link を Card で包み、lucide アイコン + 日本語ラベル + 一言説明を縦に並べる。
 * Link は Server Component で動作するため、本コンポーネントは Server Component。
 * タップ領域は Card 全体（min-h で 44px 以上を保証）。
 */
export function FeatureTile({
  href,
  icon: Icon,
  label,
  description,
  tone = 'pitch',
  className,
}: FeatureTileProps) {
  return (
    <Link
      href={href}
      className={cn('group block rounded-2xl', className)}
    >
      <Card
        interactive
        padding="md"
        className="flex min-h-[7rem] flex-col gap-2"
      >
        <span
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-xl',
            toneStyles[tone],
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-bold text-text">{label}</span>
        <span className="line-clamp-2 text-xs leading-snug text-text-muted">
          {description}
        </span>
      </Card>
    </Link>
  )
}
