import { z } from 'zod'
import type { BodyType } from '@/types/car'

const BODY_TYPES: BodyType[] = [
  'sedan', 'hatchback', 'coupe', 'wagon', 'suv',
  'minivan', 'kei', 'convertible', 'pickup', 'other',
]

/** カンマ区切り文字列 / 繰り返しクエリ（配列）→ 文字列配列 */
function splitCsv(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.flatMap((x) => splitCsv(x))
  }
  if (typeof v !== 'string' || v.trim() === '') return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

function firstString(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return ''
}

// NOTE: zod v4 では .default() がトランスフォームを通さず出力値を直接返すため、
// 既定値は使わず z.unknown() のトランスフォーム内で undefined を処理する。
export const searchParamsSchema = z.object({
  q: z
    .unknown()
    .optional()
    .transform((v) => firstString(v).trim()),
  maker: z.unknown().optional().transform(splitCsv),
  body: z
    .unknown()
    .optional()
    .transform((v) =>
      splitCsv(v).filter((b): b is BodyType =>
        (BODY_TYPES as string[]).includes(b)
      )
    ),
  country: z.unknown().optional().transform(splitCsv),
  showcaseOnly: z
    .unknown()
    .optional()
    .transform((v) => {
      const s = firstString(v)
      return s === '1' || s === 'true'
    }),
  sort: z
    .unknown()
    .optional()
    .transform((v) => {
      const s = firstString(v)
      return s === 'name' || s === 'maker' ? s : 'relevance'
    }),
})

export type SearchParamsInput = {
  q?: string
  maker?: string
  body?: string
  country?: string
  showcaseOnly?: string
  sort?: string
}

export type ParsedSearchParams = z.output<typeof searchParamsSchema>

export function parseSearchParams(raw: SearchParamsInput): ParsedSearchParams {
  return searchParamsSchema.parse(raw)
}
