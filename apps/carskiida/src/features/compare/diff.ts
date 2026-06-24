import type { SpecKey, SpecValue } from '@/types/car'
import { SPEC_LABELS, SPEC_ORDER } from '@/lib/constants/specs'

/** 比較の 1 列（対象車・世代・グレードを解決した結果の諸元集合） */
export interface CompareColumn {
  id: string
  /** 列見出し（例: "マツダ ロードスター ND・S"） */
  title: string
  subtitle?: string
  specs: Map<SpecKey, SpecValue>
}

export interface DiffCell {
  /** 値。undefined は欠損（データなし） */
  spec?: SpecValue
  /** 数値項目での相対位置。欠損や単一値では undefined */
  highlight?: 'max' | 'min'
}

export interface DiffRow {
  key: SpecKey
  label: string
  cells: DiffCell[]
  /** 全列で欠損している行か */
  allMissing: boolean
}

/**
 * 比較表の差分を計算する純関数。
 *
 * - 行はいずれかの列に存在する諸元キーのみ（SPEC_ORDER 順）。
 * - 数値項目は正規化値で最大/最小をハイライト（値が2つ以上揃い、かつ最大≠最小のときのみ）。
 * - 欠損セルは差分計算から除外する（最小値として誤判定しない）。
 */
export function computeSpecDiff(columns: CompareColumn[]): DiffRow[] {
  const keys = SPEC_ORDER.filter((key) =>
    columns.some((c) => c.specs.has(key))
  )

  return keys.map((key) => {
    const cells: DiffCell[] = columns.map((c) => ({ spec: c.specs.get(key) }))

    const present = cells
      .map((cell, index) => ({ index, spec: cell.spec }))
      .filter((x): x is { index: number; spec: SpecValue } => x.spec != null)

    const allMissing = present.length === 0

    if (present.length >= 2) {
      const values = present.map((p) => p.spec.valueNormalized)
      const max = Math.max(...values)
      const min = Math.min(...values)
      if (max !== min) {
        for (const p of present) {
          if (p.spec.valueNormalized === max) cells[p.index].highlight = 'max'
          else if (p.spec.valueNormalized === min)
            cells[p.index].highlight = 'min'
        }
      }
    }

    return { key, label: SPEC_LABELS[key], cells, allMissing }
  })
}
