import { cn } from '@/lib/utils/cn'

type ChipProps = {
  label: string
  selected: boolean
  onSelect: () => void
  /**
   * 'filter': the list's category row (36px, light when selected, never shrinks in the scroll row).
   * 'choice': the add form's 種類 (40px, accent when selected).
   */
  variant: 'filter' | 'choice'
}

/** Round toggle chip. The selection is exposed with aria-pressed (always "true" or "false"). */
export function Chip({ label, selected, onSelect, variant }: ChipProps) {
  const selectedClassName =
    variant === 'filter' ? 'border-ink bg-ink text-canvas' : 'border-accent bg-accent text-canvas'

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect()}
      className={cn(
        'whitespace-nowrap rounded-full border px-4 text-14',
        variant === 'filter' ? 'h-9 shrink-0' : 'h-10',
        selected ? cn(selectedClassName, 'font-bold') : 'border-edge-chip bg-transparent font-medium text-ink-soft',
      )}
    >
      {label}
    </button>
  )
}
