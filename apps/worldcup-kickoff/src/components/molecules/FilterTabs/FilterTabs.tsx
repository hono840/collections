'use client'

import {
  SegmentedControl,
  type SegmentedControlOption,
} from '@/components/atoms/SegmentedControl'
import { cn } from '@/lib/utils/cn'

export interface FilterTabsProps<T extends string> {
  /** タブの選択肢（グループ/ステージ等） */
  options: ReadonlyArray<SegmentedControlOption<T>>
  /** 現在値 */
  value: T
  /** 選択変更ハンドラ */
  onChange: (value: T) => void
  /** グループ全体のラベル（A11y 必須） */
  ariaLabel: string
  /** 横スクロール可能にする（タブが多いとき） */
  scrollable?: boolean
  className?: string
}

/**
 * 絞り込みタブ（グループ/ステージ等）。SegmentedControl の薄いラッパで、
 * タブ数が多いケース向けに横スクロール表示オプションを足したもの。
 * Client Component（選択状態を上位で持つ前提の制御コンポーネント）。
 */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  scrollable = false,
  className,
}: FilterTabsProps<T>) {
  if (scrollable) {
    return (
      <div
        className={cn(
          '-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        <SegmentedControl
          options={options}
          value={value}
          onChange={onChange}
          ariaLabel={ariaLabel}
          className="w-max"
        />
      </div>
    )
  }

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      ariaLabel={ariaLabel}
      fullWidth
      className={className}
    />
  )
}
