'use client'
/**
 * IngredientForm — the ingredient add/edit form (design-spec §4.2 / §8.2). Client.
 * Composes FormField + TextInput/NumberInput + UnitSelect + TaxToggle + a 歩留まり slider/input,
 * with a live 有効単価 ComputedReadout. Validation is a zod schema mirroring the domain
 * ingredient constraints (PRD edge cases: price >= 0, quantity > 0, yield 1..100 = zero-division
 * guard); messages render inline per field. `onSubmit` receives the validated form input (with the
 * derived dimension); the parent (state layer) converts it to a persisted Ingredient.
 */
import { useId, useState } from 'react'
import { z } from 'zod'
import { dimensionOf, toExTax, roundUnitPrice2, type Dimension } from '@/lib/domain'
import { cn } from '@/lib/utils/cn'
import { FormField } from '@/components/molecules/FormField'
import { TaxToggle } from '@/components/molecules/TaxToggle'
import { ComputedReadout } from '@/components/molecules/ComputedReadout'
import { TextInput } from '@/components/atoms/TextInput'
import { NumberInput } from '@/components/atoms/NumberInput'
import { UnitSelect } from '@/components/atoms/UnitSelect'
import { Slider } from '@/components/atoms/Slider'
import { Button } from '@/components/atoms/Button'
import { HelperText } from '@/components/atoms/HelperText'

export interface IngredientFormValues {
  name: string
  inputPrice: number | null
  priceIncludesTax: boolean
  taxRate: number
  purchaseQuantity: number | null
  unit: string
  yieldPercent: number | null
}

export interface IngredientFormSubmit {
  name: string
  inputPrice: number
  priceIncludesTax: boolean
  taxRate: number
  purchaseQuantity: number
  unit: string
  dimension: Dimension
  yieldPercent: number
}

export interface IngredientFormProps {
  initial?: Partial<IngredientFormValues>
  onSubmit: (values: IngredientFormSubmit) => void
  onCancel?: () => void
  submitLabel?: string
  className?: string
}

const DEFAULTS: IngredientFormValues = {
  name: '',
  inputPrice: null,
  priceIncludesTax: true,
  taxRate: 8,
  purchaseQuantity: null,
  unit: 'g',
  yieldPercent: 100,
}

/** Form schema — mirrors the domain ingredient constraints with inline Japanese messages. */
const formSchema = z.object({
  name: z.string().trim().min(1, '食材名を入力してください').max(60, '食材名は60文字以内で入力してください'),
  inputPrice: z.number({ error: '購入価格を入力してください' }).nonnegative('購入価格は0以上で入力してください'),
  purchaseQuantity: z.number({ error: '購入量を入力してください' }).positive('購入量は1以上で入力してください'),
  unit: z.string().min(1, '単位を選択してください'),
  yieldPercent: z
    .number({ error: '歩留まり率を入力してください' })
    .min(1, '歩留まり率は1以上で入力してください')
    .max(100, '歩留まり率は100以下で入力してください'),
  taxRate: z.number(),
  priceIncludesTax: z.boolean(),
})

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function IngredientForm({ initial, onSubmit, onCancel, submitLabel = '保存', className }: IngredientFormProps) {
  const [values, setValues] = useState<IngredientFormValues>({ ...DEFAULTS, ...initial })
  const [errors, setErrors] = useState<Partial<Record<keyof IngredientFormValues, string>>>({})
  const yieldErrorId = useId()

  function setField<K extends keyof IngredientFormValues>(key: K, value: IngredientFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  /** Live 有効単価 = 税抜換算価格 ÷ (購入量 × 歩留まり率). null when inputs are incomplete/invalid. */
  function effectiveUnitPrice(): number | null {
    const { inputPrice, purchaseQuantity, yieldPercent, priceIncludesTax, taxRate } = values
    if (inputPrice === null || purchaseQuantity === null || yieldPercent === null) return null
    if (inputPrice < 0 || purchaseQuantity <= 0 || yieldPercent <= 0) return null
    const exTax = toExTax(inputPrice, priceIncludesTax, taxRate)
    const usable = purchaseQuantity * (yieldPercent / 100)
    if (!(usable > 0)) return null
    return exTax / usable
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = formSchema.safeParse({
      name: values.name,
      inputPrice: values.inputPrice,
      purchaseQuantity: values.purchaseQuantity,
      unit: values.unit,
      yieldPercent: values.yieldPercent,
      taxRate: values.taxRate,
      priceIncludesTax: values.priceIncludesTax,
    })
    if (!parsed.success) {
      const next: Partial<Record<keyof IngredientFormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !(key in next)) {
          next[key as keyof IngredientFormValues] = issue.message
        }
      }
      setErrors(next)
      return
    }
    setErrors({})
    const data = parsed.data
    onSubmit({ ...data, dimension: dimensionOf(data.unit) })
  }

  const unitLabel = values.unit ? `円/${values.unit}` : '円/単位'

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-4', className)} noValidate>
      <FormField label="食材名" required error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            error={invalid}
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            maxLength={60}
            placeholder="例: 鶏もも肉"
          />
        )}
      </FormField>

      <div className="flex flex-col gap-2">
        <FormField label="購入価格" required error={errors.inputPrice}>
          {({ id, describedBy, invalid }) => (
            <NumberInput
              id={id}
              aria-describedby={describedBy}
              error={invalid}
              value={values.inputPrice}
              onChange={(v) => setField('inputPrice', v)}
              prefix="¥"
              inputMode="decimal"
            />
          )}
        </FormField>
        <TaxToggle
          includesTax={values.priceIncludesTax}
          taxRate={values.taxRate}
          onChange={({ includesTax, taxRate }) => setValues((prev) => ({ ...prev, priceIncludesTax: includesTax, taxRate }))}
        />
      </div>

      <div className="flex gap-3">
        <FormField label="購入量" required error={errors.purchaseQuantity} className="flex-1">
          {({ id, describedBy, invalid }) => (
            <NumberInput
              id={id}
              aria-describedby={describedBy}
              error={invalid}
              value={values.purchaseQuantity}
              onChange={(v) => setField('purchaseQuantity', v)}
              inputMode="decimal"
            />
          )}
        </FormField>
        <FormField label="単位" required error={errors.unit} className="w-36">
          {({ id }) => (
            <UnitSelect
              id={id}
              ariaLabel="単位"
              value={values.unit}
              allowCustom
              error={Boolean(errors.unit)}
              onChange={(u) => setField('unit', u)}
            />
          )}
        </FormField>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-label text-ink-secondary">歩留まり率</span>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Slider
              ariaLabel="歩留まり率"
              value={clamp(values.yieldPercent ?? 100, 1, 100)}
              min={1}
              max={100}
              valueText={`${values.yieldPercent ?? 0}%`}
              onChange={(v) => setField('yieldPercent', v)}
            />
          </div>
          <NumberInput
            aria-label="歩留まり率"
            aria-describedby={errors.yieldPercent ? yieldErrorId : undefined}
            error={Boolean(errors.yieldPercent)}
            value={values.yieldPercent}
            onChange={(v) => setField('yieldPercent', v)}
            unit="%"
            inputMode="numeric"
            className="w-24"
          />
        </div>
        {errors.yieldPercent && (
          <HelperText id={yieldErrorId} tone="danger">
            {errors.yieldPercent}
          </HelperText>
        )}
      </div>

      <ComputedReadout
        label="有効単価"
        value={effectiveUnitPrice()}
        unit={unitLabel}
        formatValue={(n) => String(roundUnitPrice2(n))}
        placeholder="—"
        animate
      />

      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
            キャンセル
          </Button>
        )}
        <Button type="submit" fullWidth>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
