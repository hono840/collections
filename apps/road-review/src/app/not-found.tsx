import type { Metadata } from 'next'
import Link from 'next/link'
import { AppHeader } from '@/components/organisms/AppHeader'
import { AppShellTemplate } from '@/components/templates/AppShellTemplate'

export const metadata: Metadata = {
  title: 'ページが見つかりません',
}

/** Root 404. The static export writes it to out/404.html. */
export default function NotFound() {
  return (
    <AppShellTemplate header={<AppHeader />}>
      <section aria-labelledby="not-found-heading" className="mx-auto max-w-md text-center">
        <h1 id="not-found-heading" className="text-lg font-bold text-ink">
          ページが見つかりません
        </h1>
        <p className="mt-2 text-base text-ink-muted">URL が正しいか確かめてください。</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-primary px-5 text-base font-bold text-on-primary hover:bg-primary-hover active:bg-primary-active md:w-auto"
        >
          ホームへ
        </Link>
      </section>
    </AppShellTemplate>
  )
}
