import { cn } from '@/lib/utils/cn'

type InfoTileProps = {
  label: string
  value: string
  /** Spans both columns of the detail grid (おすすめ時期). */
  wide?: boolean
}

/**
 * A detail fact box (地域 / 距離 / 時期). Renders a dt/dd pair, so place it inside a <dl>.
 * The label and value share one wrapper element.
 */
export function InfoTile({ label, value, wide = false }: InfoTileProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 rounded-tile bg-panel p-3.5', wide && 'col-span-2')}>
      <dt className="text-12 text-ink-muted">{label}</dt>
      <dd className="text-16 font-bold wrap-anywhere">{value}</dd>
    </div>
  )
}
