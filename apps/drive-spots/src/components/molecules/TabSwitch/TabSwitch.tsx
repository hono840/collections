import type { Tab } from '@/lib/spots/types'
import { cn } from '@/lib/utils/cn'

type TabSwitchProps = {
  activeTab: Tab
  wantCount: number
  doneCount: number
  onTabChange: (tab: Tab) => void
}

const TAB_OPTIONS: ReadonlyArray<{ tab: Tab; label: string; selectedClassName: string }> = [
  { tab: 'want', label: '行きたい', selectedClassName: 'bg-accent' },
  { tab: 'done', label: '行った', selectedClassName: 'bg-done' },
]

/** 「行きたい N / 行った N」. Toggle buttons with aria-pressed; the counts are totals (AC2). */
export function TabSwitch({ activeTab, wantCount, doneCount, onTabChange }: TabSwitchProps) {
  const counts: Record<Tab, number> = { want: wantCount, done: doneCount }

  return (
    <div role="group" aria-label="一覧の切り替え" className="grid grid-cols-2 gap-1.5 rounded-tile bg-panel p-1">
      {TAB_OPTIONS.map(({ tab, label, selectedClassName }) => {
        const selected = tab === activeTab
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={selected}
            onClick={() => onTabChange(tab)}
            className={cn(
              'flex items-baseline justify-center gap-1.5 rounded-tab py-2.5 text-15',
              selected ? cn(selectedClassName, 'font-bold text-canvas') : 'bg-transparent font-medium text-ink-muted',
            )}
          >
            {label}
            <span className="font-display text-18">{counts[tab]}</span>
          </button>
        )
      })}
    </div>
  )
}
