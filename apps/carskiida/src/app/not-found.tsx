import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="ck-blueprint flex min-h-dvh items-center justify-center px-4">
      <div className="text-center">
        <p
          className="text-5xl text-ck-text"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          404
        </p>
        <p className="mt-3 text-base text-ck-text-muted">
          お探しの車種は見つかりませんでした。
        </p>
        <Link
          href="/"
          className="ck-num mt-6 inline-block text-sm uppercase tracking-wide text-ck-accent transition-colors hover:underline"
        >
          ← carskiida 図鑑へ戻る
        </Link>
      </div>
    </div>
  )
}
