/**
 * MarketingTemplate — ランディング/料金/FAQ/法務の共通枠（design-spec §4.6 / §8.4）。
 * Server Component（静的・SEO・高速）。ヘッダー（ロゴ + ナビ + CTA）とフッター
 * （TrustBadge + プライバシー約束 + 法務リンク + © 行）は全マーケページで不変のためここに集約する。
 * `hero` はページ幅いっぱいのスロット、`children` は中央寄せの本文。
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ctaClass } from '@/lib/utils/cta'
import { cn } from '@/lib/utils/cn'
import { TrustBadge } from '@/components/molecules/TrustBadge'

const NAV_LINKS = [
  { href: '/#features', label: '機能' },
  { href: '/pricing', label: '料金' },
  { href: '/faq', label: 'FAQ' },
]

const FOOTER_LINKS = [
  { href: '/#features', label: '機能' },
  { href: '/pricing', label: '料金' },
  { href: '/faq', label: 'よくある質問' },
  { href: '/legal/tokushoho', label: '特定商取引法に基づく表記' },
  { href: '/legal/privacy', label: 'プライバシーポリシー' },
]

export interface MarketingTemplateProps {
  /** ページ幅いっぱいのヒーロースロット（ランディングのみ）。 */
  hero?: ReactNode
  children: ReactNode
  className?: string
}

export function MarketingTemplate({ hero, children, className }: MarketingTemplateProps) {
  const year = new Date().getFullYear()
  return (
    <div className={cn('flex min-h-dvh flex-col', className)}>
      <header className="sticky top-0 z-[var(--z-sticky-header)] border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 text-h3 font-bold text-primary-ink">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-primary font-num text-white">
              ¥
            </span>
            原価電卓
          </Link>

          <nav aria-label="主要ナビゲーション" className="hidden items-center gap-6 sm:flex">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="text-label text-ink-secondary hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/app" className={ctaClass({ size: 'md' })}>
            無料で使ってみる
          </Link>
        </div>
      </header>

      {hero}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:py-16">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
          <div className="flex flex-col gap-2">
            <TrustBadge />
            <p className="text-body-sm text-ink-secondary">
              データは端末内のみ。レシピと仕入価格は外部に送信しません。
            </p>
          </div>

          <nav aria-label="フッターナビゲーション" className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="text-body-sm text-ink-secondary hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="text-caption text-ink-muted">© {year} 原価電卓</p>
        </div>
      </footer>
    </div>
  )
}
