import Link from 'next/link'

/** S-12 / M-24: the same page for a missing id and another user's id. */
export default function RoadNotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="mx-auto max-w-md py-8 text-center">
      <h1 id="not-found-heading" className="text-lg font-bold text-ink">
        ページが見つかりません
      </h1>
      <p className="mt-2 text-base text-ink-muted">削除されたか、URLが間違っている可能性があります</p>
      <Link
        href="/roads"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-sm border border-transparent bg-primary px-5 text-base font-bold text-on-primary hover:bg-primary-hover"
      >
        道の一覧へ
      </Link>
    </section>
  )
}
