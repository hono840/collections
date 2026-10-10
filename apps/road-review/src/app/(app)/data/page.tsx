import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'データ',
}

/** "/data/". Placeholder until stage 18 (export / import, about the road data). */
export default function DataPage() {
  return (
    <section aria-labelledby="data-heading" className="mx-auto max-w-md">
      <h1 id="data-heading" className="heading-mincho text-2xl text-ink">
        データ
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        書き出しと読み込みの画面を準備しています。
      </p>
    </section>
  )
}
