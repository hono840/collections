'use client'

import { useState, type ReactNode } from 'react'
import { FieldError } from '@/components/atoms/FieldError'
import { Input } from '@/components/atoms/Input'
import { Label } from '@/components/atoms/Label'
import type { LatLng } from '@/types/road'
import { cn } from '@/lib/utils/cn'

export type LatLngInputsProps = {
  /** Prefix for the input ids, so several instances can live on one page. */
  idPrefix: string
  legend: ReactNode
  value: LatLng | null
  onChange: (value: LatLng | null) => void
  required?: boolean
  error?: string
  className?: string
}

type DraftText = { lat: string; lng: string }

const FULL_WIDTH_CHARACTERS = /[０-９．－]/g

/** Parses one coordinate field. Full-width digits are accepted; empty or non-numeric text gives null. */
function parseCoordinate(text: string): number | null {
  const normalized = text
    .replace(FULL_WIDTH_CHARACTERS, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .trim()
  if (normalized === '') return null
  const coordinate = Number(normalized)
  return Number.isFinite(coordinate) ? coordinate : null
}

function parseDraft(draft: DraftText): LatLng | null {
  const lat = parseCoordinate(draft.lat)
  const lng = parseCoordinate(draft.lng)
  return lat === null || lng === null ? null : { lat, lng }
}

function toDraft(value: LatLng | null): DraftText {
  return value ? { lat: String(value.lat), lng: String(value.lng) } : { lat: '', lng: '' }
}

function samePoint(left: LatLng | null, right: LatLng | null): boolean {
  if (left === null || right === null) return left === right
  return left.lat === right.lat && left.lng === right.lng
}

/**
 * Latitude / longitude inputs: the keyboard and no-map alternative to the map (architecture 9.4).
 * The typed text is kept locally so a half-filled pair is not lost; the parent receives a full pair
 * once both fields hold numbers, and null otherwise. Range checks are left to zod on submit.
 */
export function LatLngInputs({
  idPrefix,
  legend,
  value,
  onChange,
  required = false,
  error,
  className,
}: LatLngInputsProps) {
  const [draft, setDraft] = useState<DraftText>(() => toDraft(value))
  const [previousValue, setPreviousValue] = useState<LatLng | null>(value)

  // Follow changes that come from outside (map click, "地図の中心に置く", "終了ピンを消す").
  // Adjusting state while rendering is the documented React pattern for this.
  if (!samePoint(previousValue, value)) {
    setPreviousValue(value)
    const draftPoint = parseDraft(draft)
    const keepsHalfTypedDraft = value === null && draftPoint === null
    if (!samePoint(draftPoint, value) && !keepsHalfTypedDraft) setDraft(toDraft(value))
  }

  function update(field: keyof DraftText, text: string) {
    const nextDraft = { ...draft, [field]: text }
    setDraft(nextDraft)
    const nextPoint = parseDraft(nextDraft)
    setPreviousValue(nextPoint)
    onChange(nextPoint)
  }

  const latId = `${idPrefix}-lat`
  const lngId = `${idPrefix}-lng`
  const errorId = `${idPrefix}-latlng-error`
  const describedBy = error ? errorId : undefined

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="inline-flex items-center gap-2 text-sm font-bold text-ink">
        {legend}
        {required ? (
          <span className="rounded-full border border-ink-muted px-2 text-xs font-bold text-ink-muted">
            必須
          </span>
        ) : null}
      </legend>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={latId} className="font-normal text-ink-muted">
            緯度
          </Label>
          <Input
            id={latId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="例 36.35"
            value={draft.lat}
            onChange={(event) => update('lat', event.target.value)}
            invalid={Boolean(error)}
            aria-describedby={describedBy}
            className="num mt-1"
          />
        </div>
        <div>
          <Label htmlFor={lngId} className="font-normal text-ink-muted">
            経度
          </Label>
          <Input
            id={lngId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="例 138.7"
            value={draft.lng}
            onChange={(event) => update('lng', event.target.value)}
            invalid={Boolean(error)}
            aria-describedby={describedBy}
            className="num mt-1"
          />
        </div>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  )
}
