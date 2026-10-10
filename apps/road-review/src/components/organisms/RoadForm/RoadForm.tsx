'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import * as z from 'zod'
import { Alert } from '@/components/atoms/Alert'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { ChoiceGroup } from '@/components/molecules/ChoiceGroup'
import { ForestRoadNote } from '@/components/molecules/ForestRoadNote'
import { FormField } from '@/components/molecules/FormField'
import { PrefectureSelect } from '@/components/molecules/PrefectureSelect'
import { PinPicker, type Pins } from '@/components/organisms/PinPicker'
import type { ActionResult } from '@/lib/actions/result'
import { ROAD_TYPE_OPTIONS } from '@/lib/constants/labels'
import { NAME_MAX_LENGTH, roadInputSchema, type RoadInput } from '@/lib/validation/road'
import type { LatLng, RoadType } from '@/types/road'
import { cn } from '@/lib/utils/cn'

/** The values the edit page passes in (same shape as the action input). */
export type RoadFormDefaultValues = {
  name: string
  prefectureCode: number
  roadType: RoadType
  start: LatLng
  end: LatLng | null
}

/**
 * Saves the validated input. Resolves to an error result to show it in the form;
 * on success the caller navigates away (or resolves undefined / ok).
 */
export type RoadFormSubmit = (input: RoadInput) => Promise<ActionResult<never> | undefined>

export type RoadFormProps =
  | { mode: 'create'; onSubmit: RoadFormSubmit; className?: string }
  | {
      mode: 'edit'
      roadId: string
      defaultValues: RoadFormDefaultValues
      onSubmit: RoadFormSubmit
      className?: string
    }

type RoadFormValues = {
  name: string
  prefectureCode: number | null
  roadType: RoadType
  start: LatLng | null
  end: LatLng | null
}

type FieldName = 'name' | 'prefectureCode' | 'roadType' | 'start' | 'end'
type FieldErrorMessages = Partial<Record<FieldName, string>>

const FIELD_NAMES: readonly FieldName[] = ['name', 'prefectureCode', 'roadType', 'start', 'end']
const NAME_ID = 'road-name'

const EMPTY_VALUES: RoadFormValues = {
  name: '',
  prefectureCode: null,
  roadType: 'other',
  start: null,
  end: null,
}

/** First message per known field. Unknown keys from the server are ignored. */
function pickFieldErrors(fieldErrors: Partial<Record<string, string[]>> | undefined): FieldErrorMessages {
  const picked: FieldErrorMessages = {}
  if (!fieldErrors) return picked
  for (const field of FIELD_NAMES) {
    const message = fieldErrors[field]?.[0]
    if (message) picked[field] = message
  }
  return picked
}

type SubmitFeedback =
  | { kind: 'none' }
  | { kind: 'fields'; errors: FieldErrorMessages }
  | { kind: 'form'; message: string }

/**
 * Road create / edit form (US-02, US-09; architecture 7.2). Controlled inputs, zod on submit,
 * then the onSubmit callback is awaited inside a transition, so a returned error never
 * resets the inputs. On success the caller decides where to go.
 */
export function RoadForm(props: RoadFormProps) {
  const { mode, className } = props
  const [values, setValues] = useState<RoadFormValues>(() =>
    props.mode === 'edit' ? { ...props.defaultValues } : EMPTY_VALUES,
  )
  const [feedback, setFeedback] = useState<SubmitFeedback>({ kind: 'none' })
  // Bumped on every failed submit so the summary takes focus again, even with the same errors.
  const [failedSubmitCount, setFailedSubmitCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const summaryRef = useRef<HTMLDivElement>(null)

  const fieldErrors = feedback.kind === 'fields' ? feedback.errors : {}
  const fieldErrorCount = Object.keys(fieldErrors).length

  useEffect(() => {
    if (failedSubmitCount > 0) summaryRef.current?.focus()
  }, [failedSubmitCount])

  function update<Field extends keyof RoadFormValues>(field: Field, nextValue: RoadFormValues[Field]) {
    setValues((current) => ({ ...current, [field]: nextValue }))
  }

  function updatePins(next: Pins) {
    setValues((current) => ({ ...current, start: next.start, end: next.end }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const parsed = roadInputSchema.safeParse(values)
    if (!parsed.success) {
      setFeedback({ kind: 'fields', errors: pickFieldErrors(z.flattenError(parsed.error).fieldErrors) })
      setFailedSubmitCount((count) => count + 1)
      return
    }

    const input = parsed.data
    startTransition(async () => {
      const result = await props.onSubmit(input)
      // Success is handled by the caller (navigation), so only failures are shown here.
      if (!result || result.ok) return
      const serverFieldErrors = pickFieldErrors(result.error.fieldErrors)
      startTransition(() => {
        if (result.error.code === 'validation' && Object.keys(serverFieldErrors).length > 0) {
          setFeedback({ kind: 'fields', errors: serverFieldErrors })
        } else {
          setFeedback({ kind: 'form', message: result.error.message })
        }
        setFailedSubmitCount((count) => count + 1)
      })
    })
  }

  const nameLength = values.name.trim().length
  const nameHintId = `${NAME_ID}-hint`
  const nameErrorId = `${NAME_ID}-error`

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={mode === 'edit' ? '道の編集フォーム' : '道の登録フォーム'}
      className={cn('space-y-6', className)}
    >
      {feedback.kind === 'fields' && fieldErrorCount > 0 ? (
        <Alert ref={summaryRef} tabIndex={-1} variant="error" className="focus-visible:outline-offset-4">
          入力内容を確認してください（{fieldErrorCount}件）
        </Alert>
      ) : null}
      {feedback.kind === 'form' ? (
        <Alert ref={summaryRef} tabIndex={-1} variant="error" className="focus-visible:outline-offset-4">
          {feedback.message}
        </Alert>
      ) : null}

      <FormField
        id={NAME_ID}
        label="道の名前"
        required
        hint={
          <>
            {NAME_MAX_LENGTH}文字以内（<span className="num">{nameLength}</span>文字）
          </>
        }
        error={fieldErrors.name}
      >
        <Input
          id={NAME_ID}
          name="name"
          autoComplete="off"
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
          invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? `${nameErrorId} ${nameHintId}` : nameHintId}
        />
      </FormField>

      <PrefectureSelect
        id="road-prefecture"
        required
        value={values.prefectureCode}
        onChange={(code) => update('prefectureCode', code)}
        error={fieldErrors.prefectureCode}
      />

      <div className="space-y-3">
        <ChoiceGroup
          id="road-type"
          name="roadType"
          legend="種別"
          options={ROAD_TYPE_OPTIONS}
          value={values.roadType}
          onChange={(roadType) => update('roadType', roadType)}
          error={fieldErrors.roadType}
        />
        {values.roadType === 'forest' ? <ForestRoadNote /> : null}
      </div>

      <PinPicker
        start={values.start}
        end={values.end}
        onChange={updatePins}
        startError={fieldErrors.start}
        endError={fieldErrors.end}
      />

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Link
          href={props.mode === 'edit' ? `/roads/${props.roadId}` : '/roads'}
          className="inline-flex min-h-12 items-center justify-center rounded-sm px-5 font-bold text-primary hover:bg-primary-subtle"
        >
          キャンセル
        </Link>
        <Button type="submit" loading={isPending} className="md:min-w-40">
          {isPending ? '保存中…' : '保存'}
        </Button>
      </div>
    </form>
  )
}
