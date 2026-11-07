'use client'

import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { FieldError } from '@/components/atoms/FieldError'
import { Label } from '@/components/atoms/Label'
import { PREFECTURES } from '@/lib/constants/prefectures'
import { cn } from '@/lib/utils/cn'

export type PrefectureSelectProps = {
  id?: string
  /** JIS X 0401 code (1-47), or null when nothing is chosen. */
  value: number | null
  onChange: (code: number | null) => void
  required?: boolean
  error?: string
  className?: string
}

/** Label "都道府県" + native select with the 47 prefectures from north to south. */
export function PrefectureSelect({ id, value, onChange, required = false, error, className }: PrefectureSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className={cn('flex flex-col', className)}>
      <Label htmlFor={selectId} required={required}>
        都道府県
      </Label>
      <div className="relative mt-1.5">
        <select
          id={selectId}
          value={value === null ? '' : String(value)}
          onChange={(event) => {
            const next = event.target.value
            onChange(next === '' ? null : Number(next))
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // Same look as Input (spec 4-13): 48px, 16px text so iOS does not zoom.
            'block min-h-12 w-full appearance-none rounded-sm border border-line-strong bg-surface-raised pr-10 pl-3 text-base text-ink',
            'focus-visible:border-2 focus-visible:border-primary',
            error && 'border-2 border-danger focus-visible:border-danger',
          )}
        >
          <option value="">選んでください</option>
          {PREFECTURES.map((prefecture) => (
            <option key={prefecture.code} value={String(prefecture.code)}>
              {prefecture.name}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-muted"
        />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}
