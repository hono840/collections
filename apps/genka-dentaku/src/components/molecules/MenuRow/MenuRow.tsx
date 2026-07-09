/**
 * MenuRow — one dashboard menu row (design-spec §4.1 / §8.2). Server-compatible (the whole row
 * is a button forwarding onOpen). Left status band (solid) + name/売価/粗利 + CostRatePill +
 * chevron. 要確認/危険 get a soft tint. Money is pre-rounded by the caller; formatted here.
 */
import { ChevronRight } from 'lucide-react'
import type { AlertStatus } from '@/lib/domain'
import { formatYen } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { SEMAPHORE } from '@/components/atoms/StatusDot'
import { CostRatePill } from '@/components/molecules/CostRatePill'

export interface MenuRowProps {
  name: string
  /** Sell price to display (yen). null -> 「—」. */
  sellPrice: number | null
  /** Gross margin (yen). Optional. */
  margin?: number | null
  /** Cost rate percent, 1 decimal. */
  rate: number | null
  status: AlertStatus
  isSample?: boolean
  onOpen?: () => void
  className?: string
}

export function MenuRow({ name, sellPrice, margin, rate, status, isSample = false, onOpen, className }: MenuRowProps) {
  const desc = SEMAPHORE[status]
  const tinted = status === 'danger' || status === 'attention'
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'relative flex min-h-[var(--tap-min)] w-full items-center gap-3 rounded-md py-3 pr-3 pl-4 text-left shadow-sm transition-colors',
        tinted ? desc.bg : 'bg-surface',
        'hover:bg-surface-sunken',
        className,
      )}
    >
      <span aria-hidden className={cn('absolute top-2 bottom-2 left-0 w-1 rounded-pill', desc.solid)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-h3 truncate text-ink">{name}</span>
          {isSample && <Badge tone="neutral">サンプル</Badge>}
        </div>
        <div className="text-body-sm text-ink-secondary">
          売価 <span className="font-num tabular-nums">{sellPrice === null ? '—' : formatYen(sellPrice)}</span>
          {margin !== undefined && margin !== null && (
            <>
              {' ・粗利 '}
              <span className="font-num tabular-nums">{formatYen(margin)}</span>
            </>
          )}
        </div>
      </div>
      <CostRatePill rate={rate} status={status} size="sm" />
      <Icon icon={ChevronRight} size="sm" className="text-ink-muted" />
    </button>
  )
}
