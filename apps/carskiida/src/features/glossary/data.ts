import type { GlossaryTerm, SpecKey } from '@/types/car'
import { glossaryTerms } from '@/lib/seed/glossary'

const bySlug = new Map(glossaryTerms.map((t) => [t.slug, t]))

/** 諸元キー → 用語 slug の対応（用語が登録されているもののみ） */
const SPEC_TERM_SLUG: Partial<Record<SpecKey, string>> = {
  torque_nm: 'torque',
  power_kw: 'power',
  wheelbase_mm: 'wheelbase',
  displacement_cc: 'displacement',
  weight_kg: 'kerb-weight',
}

export async function listGlossaryTerms(): Promise<GlossaryTerm[]> {
  return [...glossaryTerms].sort((a, b) => a.reading.localeCompare(b.reading, 'ja'))
}

export async function getGlossaryTerm(
  slug: string
): Promise<GlossaryTerm | null> {
  return bySlug.get(slug) ?? null
}

export async function getGlossarySlugs(): Promise<{ slug: string }[]> {
  return glossaryTerms.map((t) => ({ slug: t.slug }))
}

/** 諸元キーに対応する用語を返す（同期・コンポーネントから利用） */
export function termForSpecKey(key: SpecKey): GlossaryTerm | undefined {
  const slug = SPEC_TERM_SLUG[key]
  return slug ? bySlug.get(slug) : undefined
}
