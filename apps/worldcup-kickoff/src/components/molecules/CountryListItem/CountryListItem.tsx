import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { CountryFlag } from '@/components/atoms/CountryFlag'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils/cn'
import type { TeamTier } from '@/lib/domain'

/** tier → 日本語ラベル + バッジ色 */
const TIER_META: Record<TeamTier, { label: string; variant: 'gold' | 'pitch' | 'neutral' }> = {
  favorite: { label: '優勝候補', variant: 'gold' },
  darkhorse: { label: 'ダークホース', variant: 'pitch' },
  underdog: { label: 'チャレンジャー', variant: 'neutral' },
}

export interface CountryListItemProps {
  /** 国旗絵文字 */
  flagEmoji: string
  /** 日本語国名 */
  nameJa: string
  /** 所属グループラベル（例: "グループA"） */
  groupLabel: string
  /** 位置づけ（任意。バッジ表示） */
  tier?: TeamTier
  /** リンク先（指定すると行全体が Link になる。国詳細 /countries/[code] 等） */
  href?: string
  /** 末尾の追加スロット（推しトグル等） */
  trailing?: React.ReactNode
  className?: string
}

/** 行の内容（旗・国名・グループ・tier バッジ） */
function ItemBody({
  flagEmoji,
  nameJa,
  groupLabel,
  tier,
  trailing,
  showChevron,
}: Pick<
  CountryListItemProps,
  'flagEmoji' | 'nameJa' | 'groupLabel' | 'tier' | 'trailing'
> & { showChevron: boolean }) {
  const tierMeta = tier ? TIER_META[tier] : null
  return (
    <>
      <CountryFlag flagEmoji={flagEmoji} nameJa={nameJa} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-text">{nameJa}</span>
          {tierMeta ? (
            <Badge variant={tierMeta.variant}>{tierMeta.label}</Badge>
          ) : null}
        </span>
        <span className="block text-xs text-text-muted">{groupLabel}</span>
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
      {showChevron ? (
        <ChevronRight
          className="h-4 w-4 shrink-0 text-text-muted"
          aria-hidden
        />
      ) : null}
    </>
  )
}

/**
 * 国一覧の1行（旗・国名・グループ・tier バッジ）。
 * `href` を渡すと行全体が `next/link` のタップ可能な行になる。Server Component。
 */
export function CountryListItem({
  flagEmoji,
  nameJa,
  groupLabel,
  tier,
  href,
  trailing,
  className,
}: CountryListItemProps) {
  const base =
    'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2 text-left'

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          'transition-colors hover:border-pitch-300 hover:bg-pitch-50',
          className,
        )}
      >
        <ItemBody
          flagEmoji={flagEmoji}
          nameJa={nameJa}
          groupLabel={groupLabel}
          tier={tier}
          trailing={trailing}
          showChevron
        />
      </Link>
    )
  }

  return (
    <div className={cn(base, className)}>
      <ItemBody
        flagEmoji={flagEmoji}
        nameJa={nameJa}
        groupLabel={groupLabel}
        tier={tier}
        trailing={trailing}
        showChevron={false}
      />
    </div>
  )
}
