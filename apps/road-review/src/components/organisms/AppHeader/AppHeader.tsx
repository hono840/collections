import Link from 'next/link'
import { Database } from 'lucide-react'

/**
 * App bar: app name (home link) + link to the data screen (export / import).
 * There is no account in v2/v3, so there is no logout. Server Component.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-14 max-w-300 items-center justify-between gap-4 px-4 md:px-5 lg:px-6">
        <Link href="/" className="heading-mincho inline-flex min-h-11 items-center text-xl text-ink">
          公道レビュー
        </Link>
        <Link
          href="/data/"
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-bold text-primary hover:bg-primary-subtle focus-visible:outline-offset-2"
        >
          <Database aria-hidden="true" className="size-4" />
          データ
        </Link>
      </div>
    </header>
  )
}
