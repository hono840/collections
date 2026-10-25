'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Chip } from '@/components/atoms/Chip'
import { PrimaryButton } from '@/components/atoms/PrimaryButton'
import { FormField } from '@/components/molecules/FormField'
import { validateSpotInput } from '@/lib/spots/spots'
import type { SpotInputErrors } from '@/lib/spots/spots'
import { CATEGORIES } from '@/lib/spots/types'
import type { SpotInput } from '@/lib/spots/types'

const BLANK_INPUT: SpotInput = {
  name: '',
  region: '',
  category: '峠',
  distanceKm: '',
  season: '',
  memo: '',
}

type SpotFormScreenProps = {
  /** Back to the list; the input is thrown away (the screen unmounts). */
  onCancel: () => void
  /** Called with the raw input once it passes validateSpotInput (addSpot trims it). */
  onSave: (input: SpotInput) => void
  /** Move focus to the title when the screen appears. */
  focusOnMount?: boolean
}

/**
 * 追加. Holds the input and the error messages. Both 保存 (header) and 保存する validate; on an
 * error, focus moves to the first wrong field, which reads its message through aria-describedby.
 * No <form>: the CSP sets form-action 'none', and Enter in a text field must not save half-typed input.
 */
export function SpotFormScreen({ onCancel, onSave, focusOnMount = false }: SpotFormScreenProps) {
  const fieldIdPrefix = useId()
  const [input, setInput] = useState<SpotInput>(BLANK_INPUT)
  const [errors, setErrors] = useState<SpotInputErrors>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const distanceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  function updateField<Field extends keyof SpotInput>(field: Field, value: SpotInput[Field]) {
    setInput((previousInput) => ({ ...previousInput, [field]: value }))
    // Editing a field clears its own error (AC10: retyping the name hides the message).
    if (field === 'name' || field === 'distanceKm') {
      setErrors((previousErrors) => ({ ...previousErrors, [field]: undefined }))
    }
  }

  function handleSave() {
    const nextErrors = validateSpotInput(input)
    if (nextErrors.name !== undefined || nextErrors.distanceKm !== undefined) {
      setErrors(nextErrors)
      const firstInvalidInput = nextErrors.name !== undefined ? nameInputRef : distanceInputRef
      firstInvalidInput.current?.focus()
      return
    }
    onSave(input)
  }

  const categoryLabelId = `${fieldIdPrefix}-category`

  return (
    <section aria-labelledby={`${fieldIdPrefix}-title`} className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-form-header items-center px-3 pb-2 pt-safe-bar">
        <button
          type="button"
          onClick={() => onCancel()}
          className="h-11 bg-transparent pl-2 text-left text-15 text-ink-soft"
        >
          キャンセル
        </button>
        <h1
          id={`${fieldIdPrefix}-title`}
          ref={headingRef}
          tabIndex={-1}
          className="text-center text-17 font-bold focus:outline-none"
        >
          スポットを追加
        </h1>
        <button
          type="button"
          onClick={handleSave}
          className="h-11 bg-transparent pr-2 text-right text-15 font-bold text-accent"
        >
          保存
        </button>
      </div>

      <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-y-contain px-5 pb-safe-form pt-3">
        <FormField
          ref={nameInputRef}
          id={`${fieldIdPrefix}-name`}
          label="スポット名（必須）"
          placeholder="例：ヤビツ峠"
          value={input.name}
          onValueChange={(value) => updateField('name', value)}
          error={errors.name}
        />

        <div className="flex flex-col gap-2">
          <p id={categoryLabelId} className="text-13 font-medium text-ink-muted">
            種類
          </p>
          <div role="group" aria-labelledby={categoryLabelId} className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category}
                selected={input.category === category}
                onSelect={() => updateField('category', category)}
                variant="choice"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            id={`${fieldIdPrefix}-region`}
            label="地域"
            placeholder="例：神奈川"
            value={input.region}
            onValueChange={(value) => updateField('region', value)}
          />
          {/* type="text" + decimal keypad instead of type="number": a number input reports '' for
              text it cannot parse, which would silently save an empty distance instead of AC11's error. */}
          <FormField
            ref={distanceInputRef}
            id={`${fieldIdPrefix}-distance`}
            label="片道の距離（km）"
            placeholder="例：60"
            inputMode="decimal"
            value={input.distanceKm}
            onValueChange={(value) => updateField('distanceKm', value)}
            error={errors.distanceKm}
          />
        </div>

        <FormField
          id={`${fieldIdPrefix}-season`}
          label="おすすめ時期"
          placeholder="例：紅葉の季節、早朝"
          value={input.season}
          onValueChange={(value) => updateField('season', value)}
        />

        <FormField
          multiline
          rows={4}
          id={`${fieldIdPrefix}-memo`}
          label="メモ"
          placeholder="例：冬は通行止め。帰りに寄りたいお店など"
          value={input.memo}
          onValueChange={(value) => updateField('memo', value)}
        />

        <PrimaryButton tone="accent" onClick={handleSave}>
          保存する
        </PrimaryButton>
      </div>
    </section>
  )
}
