/**
 * LegalPageLayout — 法務/特商法/プライバシー本文の読みやすさ最優先レイアウト（design-spec §4.6 / §8.3）。
 * Server Component。装飾は最小、本文16px以上・広めの行間・ヘアライン。
 * タイポグラフィは子孫セレクタでトークンに揃えるため、各ページは素のセマンティックタグ
 * （h2 / p / ul / ol / dl / a）を書くだけで一貫した見た目になる。
 */
import { cn } from '@/lib/utils/cn'

export interface LegalPageLayoutProps {
  title: string
  /** 改定日・最終更新日（プライバシー等）。 */
  updatedAt?: string
  children: React.ReactNode
  className?: string
}

/** 本文の子孫要素へトークン準拠のタイポグラフィを与える（@tailwindcss/typography は不採用）。 */
const PROSE = cn(
  'flex flex-col gap-5 text-body leading-loose text-ink-secondary',
  '[&_h2]:mt-8 [&_h2]:mb-1 [&_h2]:text-h2 [&_h2]:font-bold [&_h2]:text-ink',
  '[&_h3]:mt-4 [&_h3]:text-h3 [&_h3]:font-bold [&_h3]:text-ink',
  '[&_p]:leading-loose [&_strong]:font-bold [&_strong]:text-ink',
  '[&_a]:text-primary-ink [&_a]:underline [&_a]:underline-offset-2',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_li]:leading-relaxed',
  '[&_dl]:grid [&_dl]:gap-x-6 [&_dl]:gap-y-3 sm:[&_dl]:grid-cols-[16rem_1fr]',
  '[&_dt]:font-medium [&_dt]:text-ink [&_dd]:text-ink-secondary',
)

/**
 * LegalPlaceholder — Hiro 記入待ちの項目を明示するマーカー（特商法・プライバシー）。
 * 注意色でハイライトし、公開前に埋めるべき箇所を一目で分かるようにする。
 */
export function LegalPlaceholder({ children }: { children?: React.ReactNode }) {
  return <mark className="rounded bg-caution-bg px-1.5 py-0.5 text-caution-fg">【要記入】{children}</mark>
}

export function LegalPageLayout({ title, updatedAt, children, className }: LegalPageLayoutProps) {
  return (
    <article className={cn('mx-auto w-full max-w-3xl', className)}>
      <header className="mb-8">
        <h1 className="text-h1 font-bold text-ink sm:text-hero">{title}</h1>
        {updatedAt && <p className="mt-2 text-caption text-ink-muted">最終更新: {updatedAt}</p>}
      </header>
      <div className={PROSE}>{children}</div>
    </article>
  )
}
