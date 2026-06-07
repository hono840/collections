import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import { getGlossaryTerm, getGlossarySlugs } from '@/features/glossary/data'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getGlossarySlugs()
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const term = await getGlossaryTerm(slug)
  if (!term) return { title: '用語が見つかりません' }
  return {
    title: `${term.term}とは`,
    description: term.shortDef,
  }
}

export default async function GlossaryTermPage({ params }: PageProps) {
  const { slug } = await params
  const term = await getGlossaryTerm(slug)
  if (!term) notFound()

  return (
    <div className="ck-blueprint relative min-h-dvh">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <nav className="mb-6">
          <Link
            href="/glossary"
            className="ck-num text-xs uppercase tracking-wide text-ck-text-muted transition-colors hover:text-ck-accent"
          >
            ← 用語集
          </Link>
        </nav>

        <header className="mb-6 border-b-2 border-ck-border-strong pb-4">
          <p className="ck-num text-xs uppercase tracking-widest text-ck-text-muted">
            {term.reading}
          </p>
          <h1
            className="mt-1 text-4xl text-ck-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {term.term}
          </h1>
        </header>

        <p className="text-base leading-relaxed text-ck-text">{term.shortDef}</p>
        {term.longDef && (
          <p className="mt-4 text-base leading-relaxed text-ck-text">
            {term.longDef}
          </p>
        )}

        {term.source && (
          <div className="mt-8 border-t border-ck-border pt-4">
            <span className="ck-num mr-2 text-xs uppercase tracking-wide text-ck-text-muted">
              出典
            </span>
            <SourceBadge source={term.source} />
          </div>
        )}
      </div>
    </div>
  )
}
