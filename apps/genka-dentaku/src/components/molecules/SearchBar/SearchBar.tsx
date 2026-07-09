'use client'
/**
 * SearchBar — search field with a leading icon + clear affordance (design-spec §4.1 / §8.2). Client.
 * The clear button appears only when there is a query and resets to empty (or calls onClear).
 */
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TextInput } from '@/components/atoms/TextInput'
import { IconButton } from '@/components/atoms/IconButton'
import { Icon } from '@/components/atoms/Icon'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  onClear?: () => void
  className?: string
}

export function SearchBar({ value, onChange, placeholder = '検索', ariaLabel = '検索', onClear, className }: SearchBarProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <span className="pointer-events-none absolute left-3 text-ink-muted">
        <Icon icon={Search} size="sm" />
      </span>
      <TextInput
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-12 pl-9"
      />
      {value !== '' && (
        <span className="absolute right-1">
          <IconButton
            icon={X}
            label="検索をクリア"
            size="sm"
            variant="ghost"
            onClick={() => (onClear ? onClear() : onChange(''))}
          />
        </span>
      )}
    </div>
  )
}
