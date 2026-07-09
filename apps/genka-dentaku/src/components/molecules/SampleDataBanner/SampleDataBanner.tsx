/**
 * SampleDataBanner — persistent 「これはサンプルです」 notice with a clear CTA (design-spec §5.2 / §8.2).
 * Server-compatible. Sits above sample lists so users can swap to their own data.
 */
import { cn } from '@/lib/utils/cn'
import { Chip } from '@/components/atoms/Chip'
import { Button } from '@/components/atoms/Button'

export interface SampleDataBannerProps {
  message?: string
  clearLabel?: string
  onClear?: () => void
  className?: string
}

export function SampleDataBanner({
  message = 'これはサンプルです',
  clearLabel = 'サンプルを消して自分のデータを入力',
  onClear,
  className,
}: SampleDataBannerProps) {
  return (
    <div
      role="note"
      className={cn('flex flex-wrap items-center justify-between gap-2 rounded-md bg-primary-subtle px-3 py-2', className)}
    >
      <span className="inline-flex items-center gap-2">
        <Chip label="サンプル" tone="info" />
        <span className="text-body-sm text-ink-secondary">{message}</span>
      </span>
      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {clearLabel}
        </Button>
      )}
    </div>
  )
}
