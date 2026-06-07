import { TermTooltip } from '@/components/molecules/TermTooltip'
import { SPEC_LABELS } from '@/lib/constants/specs'
import { termForSpecKey } from '@/features/glossary/data'
import type { SpecKey } from '@/types/car'

export interface SpecLabelProps {
  specKey: SpecKey
}

/**
 * 諸元ラベル（molecule）。用語集に登録があればインライン解説（TermTooltip）を付与し、
 * 無ければプレーンテキストで表示する（壊れたリンクを作らない）。
 */
export function SpecLabel({ specKey }: SpecLabelProps) {
  const term = termForSpecKey(specKey)
  if (!term) {
    return <>{SPEC_LABELS[specKey]}</>
  }
  return (
    <TermTooltip
      term={term.term}
      reading={term.reading}
      shortDef={term.shortDef}
      slug={term.slug}
    />
  )
}
