'use client'

import { useMemo, useState } from 'react'
import { CalendarX } from 'lucide-react'
import { DateGroupHeader } from '@/components/molecules/DateGroupHeader'
import { FilterTabs } from '@/components/molecules/FilterTabs'
import { MatchCard } from '@/components/molecules/MatchCard'
import { EmptyState } from '@/components/atoms/EmptyState'
import { cn } from '@/lib/utils/cn'

/**
 * 1試合の表示用ビュー型。Server Component で正規化済み（シリアライズ可能な値のみ）。
 * Date は持たず、kickoffUtc は ISO 文字列で受け取る。
 */
export interface MatchScheduleItem {
  /** 試合ID（安定キー） */
  id: string
  /** ステージ（フィルタのキー） */
  stage: string
  /** グループID（"A"〜"L"）。決勝Tは null */
  groupId: string | null
  /** キックオフ（UTC ISO 8601） */
  kickoffUtc: string
  /** ホーム（確定済みのみ。未確定は null） */
  home: { flagEmoji: string; nameJa: string } | null
  /** アウェイ（確定済みのみ。未確定は null） */
  away: { flagEmoji: string; nameJa: string } | null
  /** 未確定枠の日本語ラベル */
  homePlaceholder?: string
  awayPlaceholder?: string
  /** 会場名（解決できなければ null） */
  stadiumName: string | null
  /** ステージ表示ラベル（例: "グループステージ"） */
  roundLabelJa: string
  /** 確定スコア（未実施は null） */
  score: { home: number; away: number } | null
}

/** フィルタの1区分 */
export interface MatchScheduleFilter {
  /** 一致判定キー（"all" / グループID / "knockout" 等） */
  value: string
  /** タブ表示ラベル */
  label: string
}

export interface MatchScheduleProps {
  /** 表示対象の全試合（キックオフ昇順でなくてよい。内部で日付グルーピング） */
  matches: ReadonlyArray<MatchScheduleItem>
  /** 絞り込みタブの選択肢。先頭が初期選択（通常「すべて」） */
  filters: ReadonlyArray<MatchScheduleFilter>
  className?: string
}

/** JST 日付キー（"YYYY-MM-DD"）を ISO から取り出す（date.ts と同一ロジックの軽量版） */
function jstDateKey(iso: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // en-CA は "YYYY-MM-DD" 形式
  return fmt.format(new Date(iso))
}

/** 1試合がフィルタ区分に一致するか */
function matchesFilter(item: MatchScheduleItem, filterValue: string): boolean {
  if (filterValue === 'all') return true
  if (filterValue === 'knockout') return item.stage !== 'group'
  // それ以外はグループID（"A"〜"L"）一致
  return item.groupId === filterValue
}

interface DateBucket {
  dateKey: string
  isoDate: string
  items: MatchScheduleItem[]
}

/** 試合配列を JST 日付ごとにグルーピング（日付昇順・各バケット内はキックオフ昇順） */
function groupByDate(items: MatchScheduleItem[]): DateBucket[] {
  const sorted = [...items].sort((a, b) =>
    a.kickoffUtc.localeCompare(b.kickoffUtc),
  )
  const buckets = new Map<string, MatchScheduleItem[]>()
  for (const item of sorted) {
    const key = jstDateKey(item.kickoffUtc)
    const list = buckets.get(key)
    if (list) {
      list.push(item)
    } else {
      buckets.set(key, [item])
    }
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, list]) => ({
      dateKey,
      isoDate: list[0].kickoffUtc,
      items: list,
    }))
}

/**
 * 試合日程セクション。受け取った試合を日付ごとにグルーピングして
 * DateGroupHeader + MatchCard で表示し、FilterTabs で絞り込む。
 * 絞り込み状態をローカルに持つ Client Component。
 */
export function MatchSchedule({
  matches,
  filters,
  className,
}: MatchScheduleProps) {
  const initialFilter = filters[0]?.value ?? 'all'
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter)

  const options = useMemo(
    () => filters.map((f) => ({ value: f.value, label: f.label })),
    [filters],
  )

  const buckets = useMemo(() => {
    const filtered = matches.filter((m) => matchesFilter(m, activeFilter))
    return groupByDate(filtered)
  }, [matches, activeFilter])

  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      aria-label="試合日程"
    >
      <FilterTabs
        options={options}
        value={activeFilter}
        onChange={setActiveFilter}
        ariaLabel="試合の絞り込み"
        scrollable
      />

      {buckets.length === 0 ? (
        <EmptyState
          icon={<CalendarX className="h-10 w-10" aria-hidden />}
          title="該当する試合がありません"
          description="別の区分を選ぶと試合が表示されます。"
        />
      ) : (
        <div className="flex flex-col gap-6">
          {buckets.map((bucket) => (
            <div key={bucket.dateKey} className="flex flex-col gap-3">
              <DateGroupHeader
                isoDate={bucket.isoDate}
                matchCount={bucket.items.length}
                className="sticky top-14 z-10 -mx-4 bg-bg/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-bg/80"
              />
              <ul className="flex flex-col gap-3">
                {bucket.items.map((item) => (
                  <li key={item.id}>
                    <MatchCard
                      home={item.home}
                      away={item.away}
                      homePlaceholder={item.homePlaceholder}
                      awayPlaceholder={item.awayPlaceholder}
                      kickoffUtc={item.kickoffUtc}
                      stadiumName={item.stadiumName}
                      roundLabelJa={item.roundLabelJa}
                      score={item.score}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
