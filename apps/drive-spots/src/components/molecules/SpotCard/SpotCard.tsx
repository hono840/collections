import type { Ref } from 'react'
import { Icon } from '@/components/atoms/Icon'

type SpotCardProps = {
  /** One-character category mark (CATEGORY_MARKS). Hidden from screen readers: the category is read below. */
  mark: string
  name: string
  region: string
  category: string
  done: boolean
  onOpen: () => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * One list row (AC4). The whole card is a single button whose text reads mark, name, 「地域・種類」.
 * Only phrasing content (span) is used inside the button.
 */
export function SpotCard({ mark, name, region, category, done, onOpen, ref }: SpotCardProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen()}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-edge-card bg-panel p-3.5 text-left text-ink"
    >
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-panel-raised text-18 font-bold text-accent"
      >
        {mark}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-16 font-bold">{name}</span>
        <span className="text-13 text-ink-muted wrap-anywhere">
          {region}・{category}
        </span>
      </span>
      {done ? <Icon name="check" size={22} strokeWidth={2.4} className="shrink-0 text-done" /> : null}
      <Icon name="chevronRight" size={18} className="shrink-0 text-ink-dim" />
    </button>
  )
}
