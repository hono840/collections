'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { Alert } from '@/components/atoms/Alert'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { ChoiceGroup } from '@/components/molecules/ChoiceGroup'
import { ForestRoadNote } from '@/components/molecules/ForestRoadNote'
import { FormField } from '@/components/molecules/FormField'
import { RatingInput } from '@/components/molecules/RatingInput'
import { SafetyNoticeBanner } from '@/components/molecules/SafetyNoticeBanner'
import { RoadInfoFieldset, type RoadInfoFieldsetErrors } from '@/components/organisms/RoadInfoFieldset'
import type { ActionResult } from '@/lib/actions/result'
import {
  RATING_AXIS_LABELS,
  RATING_SCALE_LABELS,
  TRAFFIC_NOTE,
  TRAFFIC_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  WEATHER_OPTIONS,
} from '@/lib/constants/labels'
import { FORM_ERROR_KEY, toFieldErrors } from '@/lib/validation/common'
import { MEMO_MAX_LENGTH, driveInputSchema, type DriveInput } from '@/lib/validation/drive'
import {
  ROAD_INFO_ITEMS,
  emptyRoadInfoInput,
  hasAnyRoadInfoItem,
  type RoadInfoInput,
} from '@/lib/validation/road-info'
import type { TrafficLevel, VehicleType, Weather } from '@/types/drive'
import type { RoadType } from '@/types/road'
import { cn } from '@/lib/utils/cn'

/**
 * Saves the validated input. Resolves to an error result to show it in the form;
 * on success the caller navigates away (or resolves undefined / ok).
 */
export type DriveFormSubmit = (input: DriveInput) => Promise<ActionResult<never> | undefined>

type DriveFormCommonProps = {
  roadId: string
  roadName: string
  roadType: RoadType
  onSubmit: DriveFormSubmit
  className?: string
}

export type DriveFormProps =
  | (DriveFormCommonProps & { mode: 'create'; defaultDrivenOn: string })
  | (DriveFormCommonProps & { mode: 'edit'; driveId: string; defaultValues: DriveInput })

type DriveFormValues = {
  drivenOn: string
  vehicleType: VehicleType | null
  weather: Weather | null
  ratingOverall: number | null
  ratingScenery: number | null
  ratingRoadSurface: number | null
  ratingEaseOfDriving: number | null
  traffic: TrafficLevel | null
  memo: string
  roadInfo: RoadInfoInput
}

type DriveFieldName =
  | 'drivenOn'
  | 'vehicleType'
  | 'weather'
  | 'ratingOverall'
  | 'ratingScenery'
  | 'ratingRoadSurface'
  | 'ratingEaseOfDriving'
  | 'traffic'
  | 'memo'

const DRIVE_FIELD_NAMES: readonly DriveFieldName[] = [
  'drivenOn',
  'vehicleType',
  'weather',
  'ratingOverall',
  'ratingScenery',
  'ratingRoadSurface',
  'ratingEaseOfDriving',
  'traffic',
  'memo',
]

type FormErrors = {
  fields: Partial<Record<DriveFieldName, string>>
  roadInfo: RoadInfoFieldsetErrors
  /** Issues without a field (shown in the summary). */
  form?: string
}

type SubmitFeedback =
  | { kind: 'none' }
  | { kind: 'fields'; errors: FormErrors; count: number }
  | { kind: 'form'; message: string }

const DRIVEN_ON_ID = 'drive-driven-on'
const MEMO_ID = 'drive-memo'
const MEMO_PLACEHOLDER = '景色や路面の様子、次に来るときのメモなど'

function initialValues(props: DriveFormProps): DriveFormValues {
  if (props.mode === 'create') {
    return {
      drivenOn: props.defaultDrivenOn,
      vehicleType: null,
      weather: null,
      ratingOverall: null,
      ratingScenery: null,
      ratingRoadSurface: null,
      ratingEaseOfDriving: null,
      traffic: null,
      memo: '',
      roadInfo: emptyRoadInfoInput(),
    }
  }
  const defaults = props.defaultValues
  return {
    drivenOn: defaults.drivenOn,
    vehicleType: defaults.vehicleType,
    weather: defaults.weather,
    ratingOverall: defaults.ratingOverall ?? null,
    ratingScenery: defaults.ratingScenery,
    ratingRoadSurface: defaults.ratingRoadSurface,
    ratingEaseOfDriving: defaults.ratingEaseOfDriving,
    traffic: defaults.traffic,
    memo: defaults.memo ?? '',
    roadInfo: defaults.roadInfo ?? emptyRoadInfoInput(),
  }
}

/**
 * Maps flat error keys (toFieldErrors(): 'drivenOn', 'roadInfo.confirmedOn', 'roadInfo.items.toll.memo', ...)
 * to the fields that show them. The first message per field wins; unknown keys are ignored.
 */
function toFormErrors(fieldErrors: Partial<Record<string, string[]>> | undefined): { errors: FormErrors; count: number } {
  const errors: FormErrors = { fields: {}, roadInfo: {} }
  let count = 0
  if (!fieldErrors) return { errors, count }

  for (const field of DRIVE_FIELD_NAMES) {
    const message = fieldErrors[field]?.[0]
    if (message) {
      errors.fields[field] = message
      count += 1
    }
  }

  const confirmedOnMessage = fieldErrors['roadInfo.confirmedOn']?.[0]
  if (confirmedOnMessage) {
    errors.roadInfo.confirmedOn = confirmedOnMessage
    count += 1
  }

  const roadInfoMessage = fieldErrors.roadInfo?.[0] ?? fieldErrors[`roadInfo.${FORM_ERROR_KEY}`]?.[0]
  if (roadInfoMessage) {
    errors.roadInfo.form = roadInfoMessage
    count += 1
  }

  for (const item of ROAD_INFO_ITEMS) {
    const message = fieldErrors[`roadInfo.items.${item}.memo`]?.[0]
    if (message) {
      errors.roadInfo.memos = { ...errors.roadInfo.memos, [item]: message }
      count += 1
    }
  }

  const formMessage = fieldErrors[FORM_ERROR_KEY]?.[0]
  if (formMessage) {
    errors.form = formMessage
    count += 1
  }

  return { errors, count }
}

/**
 * Drive record create / edit form (US-03 / US-04 / US-09; architecture 7.2; UX S-08).
 * The safety banner (M-01) is always the first thing in the form, followed by the 林道 note (M-08).
 * Controlled inputs, zod on submit, then the onSubmit callback is awaited inside a transition,
 * so a returned error never clears what was typed. On success the caller decides where to go.
 * No time / duration / speed fields by design (PRD US-06, US-14).
 */
export function DriveForm(props: DriveFormProps) {
  const { mode, roadId, roadName, roadType, className } = props
  const [values, setValues] = useState<DriveFormValues>(() => initialValues(props))
  const [feedback, setFeedback] = useState<SubmitFeedback>({ kind: 'none' })
  // Bumped on every failed submit so the summary takes focus again, even with the same errors.
  const [failedSubmitCount, setFailedSubmitCount] = useState(0)
  const [isPending, startTransition] = useTransition()
  const summaryRef = useRef<HTMLDivElement>(null)

  const errors: FormErrors = feedback.kind === 'fields' ? feedback.errors : { fields: {}, roadInfo: {} }
  const fieldErrors = errors.fields

  useEffect(() => {
    if (failedSubmitCount > 0) summaryRef.current?.focus()
  }, [failedSubmitCount])

  function update<Field extends keyof DriveFormValues>(field: Field, nextValue: DriveFormValues[Field]) {
    setValues((current) => ({ ...current, [field]: nextValue }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    // Every item 記録しない -> no road_info row (the schema would otherwise ask for one item, M-27).
    const candidate = { ...values, roadInfo: hasAnyRoadInfoItem(values.roadInfo) ? values.roadInfo : null }
    const parsed = driveInputSchema.safeParse(candidate)
    if (!parsed.success) {
      const { errors: clientErrors, count } = toFormErrors(toFieldErrors(parsed.error))
      setFeedback({ kind: 'fields', errors: clientErrors, count })
      setFailedSubmitCount((current) => current + 1)
      return
    }

    const input = parsed.data
    startTransition(async () => {
      const result = await props.onSubmit(input)
      // Success is handled by the caller (navigation), so only failures are shown here.
      if (!result || result.ok) return
      const { errors: serverErrors, count } = toFormErrors(result.error.fieldErrors)
      startTransition(() => {
        if (result.error.code === 'validation' && count > 0) {
          setFeedback({ kind: 'fields', errors: serverErrors, count })
        } else {
          setFeedback({ kind: 'form', message: result.error.message })
        }
        setFailedSubmitCount((current) => current + 1)
      })
    })
  }

  const drivenOnError = fieldErrors.drivenOn
  const memoError = fieldErrors.memo
  const memoHintId = `${MEMO_ID}-hint`

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={mode === 'edit' ? '走行記録の編集フォーム' : '走行記録の登録フォーム'}
      className={cn('space-y-6', className)}
    >
      <SafetyNoticeBanner />
      {roadType === 'forest' ? <ForestRoadNote className="-mt-4" /> : null}

      {feedback.kind === 'fields' ? (
        <Alert ref={summaryRef} tabIndex={-1} variant="error" className="focus-visible:outline-offset-4">
          <p>入力内容を確認してください（{feedback.count}件）</p>
          {errors.form ? <p className="mt-1">{errors.form}</p> : null}
        </Alert>
      ) : null}
      {feedback.kind === 'form' ? (
        <Alert ref={summaryRef} tabIndex={-1} variant="error" className="focus-visible:outline-offset-4">
          {feedback.message}
        </Alert>
      ) : null}

      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-sm font-bold text-ink-muted">道</span>
        <span className="heading-mincho text-lg break-words text-ink">{roadName}</span>
      </p>

      <FormField id={DRIVEN_ON_ID} label="走行日" required error={drivenOnError}>
        <Input
          id={DRIVEN_ON_ID}
          name="drivenOn"
          type="date"
          required
          className="num md:max-w-60"
          value={values.drivenOn}
          onChange={(event) => update('drivenOn', event.target.value)}
          invalid={Boolean(drivenOnError)}
          aria-describedby={drivenOnError ? `${DRIVEN_ON_ID}-error` : undefined}
        />
      </FormField>

      <RatingInput
        id="drive-rating-overall"
        name="ratingOverall"
        legend={RATING_AXIS_LABELS.overall}
        labels={RATING_SCALE_LABELS.overall}
        value={values.ratingOverall}
        onChange={(next) => update('ratingOverall', next)}
        required
        error={fieldErrors.ratingOverall}
      />
      <RatingInput
        id="drive-rating-scenery"
        name="ratingScenery"
        legend={RATING_AXIS_LABELS.scenery}
        labels={RATING_SCALE_LABELS.scenery}
        value={values.ratingScenery}
        onChange={(next) => update('ratingScenery', next)}
        error={fieldErrors.ratingScenery}
      />
      <RatingInput
        id="drive-rating-road-surface"
        name="ratingRoadSurface"
        legend={RATING_AXIS_LABELS.roadSurface}
        labels={RATING_SCALE_LABELS.roadSurface}
        value={values.ratingRoadSurface}
        onChange={(next) => update('ratingRoadSurface', next)}
        error={fieldErrors.ratingRoadSurface}
      />
      <RatingInput
        id="drive-rating-ease-of-driving"
        name="ratingEaseOfDriving"
        legend={RATING_AXIS_LABELS.easeOfDriving}
        labels={RATING_SCALE_LABELS.easeOfDriving}
        value={values.ratingEaseOfDriving}
        onChange={(next) => update('ratingEaseOfDriving', next)}
        error={fieldErrors.ratingEaseOfDriving}
      />

      <ChoiceGroup
        id="drive-traffic"
        name="traffic"
        legend="交通量"
        options={TRAFFIC_OPTIONS}
        value={values.traffic}
        onChange={(next) => update('traffic', next)}
        hint={TRAFFIC_NOTE}
        error={fieldErrors.traffic}
      />
      <ChoiceGroup
        id="drive-vehicle-type"
        name="vehicleType"
        legend="車両"
        options={VEHICLE_TYPE_OPTIONS}
        value={values.vehicleType}
        onChange={(next) => update('vehicleType', next)}
        error={fieldErrors.vehicleType}
      />
      <ChoiceGroup
        id="drive-weather"
        name="weather"
        legend="天候"
        options={WEATHER_OPTIONS}
        value={values.weather}
        onChange={(next) => update('weather', next)}
        error={fieldErrors.weather}
      />

      <FormField id={MEMO_ID} label="メモ" hint={`${values.memo.length}/${MEMO_MAX_LENGTH}`} error={memoError}>
        <Textarea
          id={MEMO_ID}
          name="memo"
          placeholder={MEMO_PLACEHOLDER}
          value={values.memo}
          onChange={(event) => update('memo', event.target.value)}
          invalid={Boolean(memoError)}
          aria-describedby={memoError ? `${MEMO_ID}-error ${memoHintId}` : memoHintId}
        />
      </FormField>

      <RoadInfoFieldset
        value={values.roadInfo}
        onChange={(next) => update('roadInfo', next)}
        errors={errors.roadInfo}
      />

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Link
          href={`/roads/${roadId}`}
          className="inline-flex min-h-12 items-center justify-center rounded-sm px-5 font-bold text-primary hover:bg-primary-subtle"
        >
          キャンセル
        </Link>
        <Button type="submit" loading={isPending} className="md:min-w-40">
          {isPending ? '保存中…' : '記録を保存'}
        </Button>
      </div>
    </form>
  )
}
