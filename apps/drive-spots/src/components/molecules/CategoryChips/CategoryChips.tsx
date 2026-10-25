import { Chip } from '@/components/atoms/Chip'

type CategoryChipsProps<Option extends string> = {
  options: readonly Option[]
  selected: Option
  onSelect: (option: Option) => void
  /** Accessible name of the chip group. */
  label: string
}

/**
 * The list's horizontally scrolling filter row (scrollbar hidden). pt-1/-mt-1 leaves room for the
 * focus outline, which the scroll container would otherwise clip, without moving the chips.
 */
export function CategoryChips<Option extends string>({
  options,
  selected,
  onSelect,
  label,
}: CategoryChipsProps<Option>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="scrollbar-hidden -mt-1 flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain px-5 pb-3.5 pt-1"
    >
      {options.map((option) => (
        <Chip
          key={option}
          label={option}
          selected={option === selected}
          onSelect={() => onSelect(option)}
          variant="filter"
        />
      ))}
    </div>
  )
}
