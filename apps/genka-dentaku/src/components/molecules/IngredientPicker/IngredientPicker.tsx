'use client'
/**
 * IngredientPicker — searchable select of ingredients (design-spec §4.3 / §8.2). Client.
 * A select-only combobox button opens a listbox with a live text filter (by name). Selecting an
 * option reports its id and closes; Escape and outside-click also close. Options are focusable
 * so the control is keyboard operable.
 */
import { useState, useRef, useEffect, useId } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import type { Ingredient } from '@/lib/domain'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { TextInput } from '@/components/atoms/TextInput'

export interface IngredientPickerProps {
  ingredients: Ingredient[]
  value: string | null
  onChange: (id: string) => void
  placeholder?: string
  ariaLabel?: string
  error?: boolean
  id?: string
  className?: string
}

export function IngredientPicker({
  ingredients,
  value,
  onChange,
  placeholder = '食材を選択',
  ariaLabel = '食材',
  error = false,
  id,
  className,
}: IngredientPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selected = ingredients.find((i) => i.id === value) ?? null
  const q = query.trim().toLowerCase()
  const filtered = q === '' ? ingredients : ingredients.filter((i) => i.name.toLowerCase().includes(q))

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  function choose(iid: string) {
    onChange(iid)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className={cn(
          'text-body flex min-h-[var(--input-min-h)] w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-left',
          error ? 'border-danger-fg' : 'border-border-strong',
        )}
      >
        <span className={cn('truncate', selected ? 'text-ink' : 'text-ink-muted')}>
          {selected ? selected.name : placeholder}
        </span>
        <Icon icon={ChevronDown} size="sm" className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          <div className="relative flex items-center border-b border-border p-2">
            <span className="pointer-events-none absolute left-4 text-ink-muted">
              <Icon icon={Search} size="sm" />
            </span>
            <TextInput
              aria-label="食材を検索"
              placeholder="検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ul id={listboxId} role="listbox" aria-label={ariaLabel} className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="text-body-sm px-3 py-2 text-ink-muted">該当する食材がありません</li>
            ) : (
              filtered.map((i) => {
                const isSel = i.id === value
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => choose(i.id)}
                      className={cn(
                        'text-body flex min-h-[var(--tap-min-compact)] w-full items-center justify-between gap-2 px-3 py-2 text-left',
                        isSel ? 'bg-primary-subtle text-primary-ink' : 'text-ink hover:bg-surface-sunken',
                      )}
                    >
                      <span className="truncate">{i.name}</span>
                      {isSel && <Icon icon={Check} size="sm" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
