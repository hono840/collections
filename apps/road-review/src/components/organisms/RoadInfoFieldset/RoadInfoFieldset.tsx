'use client'

import { useId } from 'react'
import { Alert } from '@/components/atoms/Alert'
import { Input } from '@/components/atoms/Input'
import { ChoiceGroup, type ChoiceOption } from '@/components/molecules/ChoiceGroup'
import { FormField } from '@/components/molecules/FormField'
import { ROAD_INFO_NOTE } from '@/components/molecules/RoadInfoSummary'
import {
  NOT_RECORDED_LABEL,
  PRESENCE_STATUS_LABELS,
  ROAD_INFO_ITEM_LABELS,
  TOLL_STATUS_LABELS,
} from '@/lib/constants/labels'
import {
  FACILITY_ITEMS,
  PRESENCE_STATUSES,
  ROAD_INFO_MEMO_MAX_LENGTH,
  ROAD_RULE_ITEMS,
  TOLL_STATUSES,
  type RoadInfoInput,
  type RoadInfoItem,
  type RoadInfoStatus,
} from '@/lib/validation/road-info'
import { cn } from '@/lib/utils/cn'

export type RoadInfoFieldsetErrors = {
  confirmedOn?: string
  /** M-27 etc. (issues on the road info as a whole). */
  form?: string
  memos?: Partial<Record<RoadInfoItem, string>>
}

export type RoadInfoFieldsetProps = {
  value: RoadInfoInput
  onChange: (next: RoadInfoInput) => void
  errors?: RoadInfoFieldsetErrors
  className?: string
}

/** M-32 */
const CONFIRMED_ON_HINT = '記録しない以外を選んだ項目に、この日付が付きます。'

/** Radio value of the "記録しない" option (status null). */
const NOT_RECORDED = 'none'
type OptionValue = RoadInfoStatus | typeof NOT_RECORDED

const PRESENCE_OPTIONS: ReadonlyArray<ChoiceOption<OptionValue>> = [
  ...PRESENCE_STATUSES.map((status) => ({ value: status, label: PRESENCE_STATUS_LABELS[status] })),
  { value: NOT_RECORDED, label: NOT_RECORDED_LABEL },
]

const TOLL_OPTIONS: ReadonlyArray<ChoiceOption<OptionValue>> = [
  ...TOLL_STATUSES.map((status) => ({ value: status, label: TOLL_STATUS_LABELS[status] })),
  { value: NOT_RECORDED, label: NOT_RECORDED_LABEL },
]

type ItemState = { status: RoadInfoStatus | null; memo: string }

/**
 * Road info inputs inside DriveForm (architecture 2.1 / ch.20-2; PRD US-10; spec 4-6 RoadInfoForm).
 * One shared 確認日 (empty = the drive date), then one radio group per item with 記録しない as the default.
 * The memo field appears only for recorded items. Controlled: every change is reported via onChange.
 */
export function RoadInfoFieldset({ value, onChange, errors, className }: RoadInfoFieldsetProps) {
  const baseId = useId()
  const confirmedOnId = `${baseId}-confirmed-on`
  const confirmedOnHintId = `${confirmedOnId}-hint`
  const confirmedOnErrorId = `${confirmedOnId}-error`

  function itemState(item: RoadInfoItem): ItemState {
    return value.items[item]
  }

  function updateItem(item: RoadInfoItem, next: ItemState) {
    onChange({ ...value, items: { ...value.items, [item]: next } as RoadInfoInput['items'] })
  }

  function renderItem(item: RoadInfoItem) {
    const state = itemState(item)
    const label = ROAD_INFO_ITEM_LABELS[item]
    const memoId = `${baseId}-${item}-memo`
    const memoError = errors?.memos?.[item]
    const memoCounterId = `${memoId}-hint`
    return (
      <div key={item} className="space-y-2">
        <ChoiceGroup<OptionValue>
          id={`${baseId}-${item}`}
          name={`roadInfo-${item}`}
          legend={label}
          options={item === 'toll' ? TOLL_OPTIONS : PRESENCE_OPTIONS}
          value={state.status ?? NOT_RECORDED}
          onChange={(next) => updateItem(item, { ...state, status: next === NOT_RECORDED ? null : next })}
        />
        {state.status !== null ? (
          <FormField id={memoId} label={`${label}のメモ`} error={memoError}>
            <Input
              id={memoId}
              name={`roadInfo-${item}-memo`}
              autoComplete="off"
              maxLength={ROAD_INFO_MEMO_MAX_LENGTH}
              value={state.memo}
              onChange={(event) => updateItem(item, { ...state, memo: event.target.value })}
              invalid={Boolean(memoError)}
              aria-describedby={memoError ? `${memoId}-error ${memoCounterId}` : memoCounterId}
            />
            <p id={memoCounterId} className="num mt-1 text-right text-xs text-ink-muted">
              {`${state.memo.length}/${ROAD_INFO_MEMO_MAX_LENGTH}`}
            </p>
          </FormField>
        ) : null}
      </div>
    )
  }

  return (
    <fieldset className={cn('min-w-0 rounded-md border border-line bg-surface p-4', className)}>
      <legend className="px-1 text-base font-bold text-ink">道の情報</legend>

      {errors?.form ? (
        <Alert variant="error" className="mb-4">
          {errors.form}
        </Alert>
      ) : null}

      <FormField id={confirmedOnId} label="確認日" hint={CONFIRMED_ON_HINT} error={errors?.confirmedOn}>
        <Input
          id={confirmedOnId}
          name="roadInfo-confirmedOn"
          type="date"
          className="num md:max-w-60"
          value={value.confirmedOn ?? ''}
          onChange={(event) => onChange({ ...value, confirmedOn: event.target.value === '' ? null : event.target.value })}
          invalid={Boolean(errors?.confirmedOn)}
          aria-describedby={errors?.confirmedOn ? `${confirmedOnErrorId} ${confirmedOnHintId}` : confirmedOnHintId}
        />
      </FormField>

      <h3 className="mt-6 flex items-center gap-2 text-xs font-bold text-ink-muted">
        通行ルール
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </h3>
      <div className="mt-3 space-y-5">{ROAD_RULE_ITEMS.map(renderItem)}</div>

      <h3 className="mt-6 flex items-center gap-2 text-xs font-bold text-ink-muted">
        施設
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </h3>
      <div className="mt-3 space-y-5">{FACILITY_ITEMS.map(renderItem)}</div>

      <p className="mt-6 text-sm leading-relaxed text-ink-muted">{ROAD_INFO_NOTE}</p>
    </fieldset>
  )
}
