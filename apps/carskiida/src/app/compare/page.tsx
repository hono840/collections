import type { Metadata } from 'next'
import { CompareTemplate } from '@/components/templates/CompareTemplate'
import { parseCompareIds, buildCompareColumns } from '@/features/compare/data'

export const metadata: Metadata = {
  title: '諸元比較',
  description: '車種・世代・グレードを横断して諸元を比較する。',
}

interface PageProps {
  searchParams: Promise<{ ids?: string }>
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { ids } = await searchParams
  const refs = parseCompareIds(ids)
  const columns = await buildCompareColumns(refs)
  return <CompareTemplate columns={columns} />
}
