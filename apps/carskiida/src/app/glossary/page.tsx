import type { Metadata } from 'next'
import Link from 'next/link'
import { SourceBadge } from '@/components/atoms/SourceBadge'
import { listGlossaryTerms } from '@/features/glossary/data'

export const metadata: Metadata = {
  title: '自動車用語集',
  description:
    'トルク・最高出力・ホイールベース・駆動方式など、スペック用語をやさしく解説。',
}

export default async function GlossaryPage() {
  const terms = await listGlossaryTerms()

  return (
    <div className="ck-blueprint relative min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
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
            Glossary
          </p>
          <h1
            className="mt-1 text-3xl text-ck-text sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            自動車用語集
          </h1>
          <p className="mt-2 text-sm text-ck-text-muted">
            スペック表に出てくる用語を、初めての人にも分かるように解説します。
          </p>
        </header>

        <ul className="space-y-3">
          {terms.map((term) => (
            <li key={term.slug}>
              <Link
                href={`/glossary/${term.slug}`}
                className="block rounded-md border border-ck-border bg-ck-surface px-4 py-3 transition-colors hover:border-ck-accent"
              >
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg text-ck-text">{term.term}</h2>
                  <span className="ck-num text-xs text-ck-text-muted">
                    {term.reading}
                  </span>
                  {term.source && (
                    <span className="ml-auto">
                      <SourceBadge source={term.source} />
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ck-text-muted">
                  {term.shortDef}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
