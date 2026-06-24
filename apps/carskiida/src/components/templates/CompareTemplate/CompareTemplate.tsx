import Link from 'next/link'
import { SectionHeading } from '@/components/atoms/SectionHeading'
import { SpecComparisonTable } from '@/components/organisms/SpecComparisonTable'
import type { CompareColumn } from '@/features/compare/diff'

export interface CompareTemplateProps {
  columns: CompareColumn[]
}

/**
 * 比較テンプレート。2〜4台の諸元を横断比較する。
 */
export function CompareTemplate({ columns }: CompareTemplateProps) {
  return (
    <div className="ck-blueprint relative min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
        <nav className="mb-6">
          <Link
            href="/"
            className="ck-num text-xs uppercase tracking-wide text-ck-text-muted transition-colors hover:text-ck-accent"
          >
            ← carskiida 図鑑
          </Link>
        </nav>

        <header className="mb-8 border-b-2 border-ck-border-strong pb-4">
          <p className="ck-num text-xs uppercase tracking-widest text-ck-text-muted">
            Comparison
          </p>
          <h1
            className="mt-1 text-3xl text-ck-text sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            諸元比較
          </h1>
        </header>

        {columns.length < 2 ? (
          <div className="rounded-md border border-dashed border-ck-border bg-ck-surface px-5 py-8 text-center">
            <p className="text-base text-ck-text">
              比較するには 2 台以上を選択してください。
            </p>
            <p className="mt-2 text-sm text-ck-text-muted">
              図鑑の各車種ページや一覧カードの「+ 比較」から追加できます。
            </p>
            <Link
              href="/"
              className="ck-num mt-4 inline-block rounded-sm border-2 border-ck-accent px-3 py-1.5 text-xs uppercase tracking-wide text-ck-accent transition-colors hover:bg-ck-accent/10"
            >
              車種を探す →
            </Link>
          </div>
        ) : (
          <section>
            <SectionHeading label="Specifications">
              スペック差分
            </SectionHeading>
            <SpecComparisonTable columns={columns} />
            <p className="mt-4 text-xs leading-relaxed text-ck-text-muted">
              ▲ = 最大値 / ▼ = 最小値。揃わない項目は「—」で示し差分計算から除外しています。
              各値の出典はバッジから確認できます。
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
