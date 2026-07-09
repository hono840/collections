/**
 * ランディング（/）— Server Component・静的（architecture §8.1 / §13 step 11, PRD 11.1）。
 * ヒーロー（H1 原文固定）+ wedge 3ステップ + 主要機能 + Excel 乗り換え + プライバシー
 * + 料金ティザー + FAQ 抜粋 + 最終 CTA。SoftwareApplication / FAQPage の JSON-LD をインライン。
 * 重い client JS は持たない（速度優先・design-spec §4.6）。
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Zap, TrendingUp, TriangleAlert, FileDown, ShieldCheck, Check } from 'lucide-react'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, jsonLdString } from '@/lib/site'
import { LANDING_FAQ } from '@/lib/content/faq'
import { ctaClass } from '@/lib/utils/cta'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { TrustBadge } from '@/components/molecules/TrustBadge'
import { MarketingTemplate } from '@/components/templates/MarketingTemplate'
import { MarketingHero, HERO_SUB } from '@/components/organisms/MarketingHero'
import { FaqAccordion } from '@/components/organisms/FaqAccordion'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const FEATURES = [
  {
    icon: Zap,
    title: '仕入れ値1つで全再計算',
    desc: '食材の価格を1箇所直すだけで、その食材を使う全メニューの原価率が同時に再計算されます。',
  },
  {
    icon: TrendingUp,
    title: '値上げシミュレーション',
    desc: '“原価率30%にするには何円？” を逆算。目標原価率から推奨売価を提案します。',
  },
  {
    icon: TriangleAlert,
    title: '原価率アラート',
    desc: '原価率を信号色で可視化し、危険なメニューを悪い順に集約。無料で使えます。',
    free: true,
  },
  {
    icon: FileDown,
    title: 'CSV・PDF 出力',
    desc: '原価表・原価計算書を CSV / PDF で出力。取引先や税理士への提出物に。',
    pro: true,
  },
  {
    icon: ShieldCheck,
    title: 'ローカル完結',
    desc: 'レシピと仕入価格は端末内のみ。登録不要・外部送信なしで安心して使えます。',
  },
]

const STEPS = [
  { n: 1, title: '食材を登録', desc: '仕入価格と購入量を入れるだけ。税込／税抜のどちらでも入力できます。' },
  { n: 2, title: 'メニューにレシピを組む', desc: '食材と分量を選ぶと、原価・原価率・粗利が自動で計算されます。' },
  { n: 3, title: '仕入値を1つ直す', desc: '価格が上がったら1箇所直すだけ。使っている全メニューが即再計算されます。' },
]

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: `${SITE_DESCRIPTION} 飲食店向けのメニュー原価計算ツール。`,
  offers: [
    { '@type': 'Offer', price: '0', priceCurrency: 'JPY', name: 'Free' },
    { '@type': 'Offer', price: '980', priceCurrency: 'JPY', name: 'Pro（月額）' },
    { '@type': 'Offer', price: '9800', priceCurrency: 'JPY', name: 'Pro（年額）' },
  ],
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: LANDING_FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export default function HomePage() {
  return (
    <MarketingTemplate hero={<MarketingHero />}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }} />

      {/* 使い方 3ステップ（wedge 解説） */}
      <section aria-labelledby="steps-heading" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 id="steps-heading" className="text-h1 font-bold text-ink">
            使い方は3ステップ
          </h2>
          <p className="text-body text-ink-secondary">難しい設定はありません。サンプルを入れて、価格を1つ変えるだけで体感できます。</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-6">
              <span className="grid h-10 w-10 place-items-center rounded-pill bg-primary font-num text-metric font-bold text-white">
                {step.n}
              </span>
              <h3 className="text-h3 font-bold text-ink">{step.title}</h3>
              <p className="text-body-sm text-ink-secondary">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 主要機能 */}
      <section aria-labelledby="features-heading" id="features" className="mt-16 flex flex-col gap-8 scroll-mt-20">
        <h2 id="features-heading" className="text-h1 font-bold text-ink">
          できること
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-primary-subtle text-primary-ink">
                  <Icon icon={feature.icon} size="md" />
                </span>
                {feature.pro && <Badge tone="pro">PRO</Badge>}
                {feature.free && <Badge tone="info">無料</Badge>}
              </div>
              <h3 className="text-h3 font-bold text-ink">{feature.title}</h3>
              <p className="text-body-sm text-ink-secondary">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Excel 乗り換え（エクセルクラスタ） */}
      <section aria-labelledby="excel-heading" className="mt-16 flex flex-col gap-4 rounded-lg bg-surface-sunken p-8">
        <h2 id="excel-heading" className="text-h1 font-bold text-ink">
          Excelの原価表は、もう更新しなくていい
        </h2>
        <p className="max-w-prose text-body text-ink-secondary">
          原価計算のエクセルテンプレートは、食材が1つ値上がりするたびに各シートを手で直す必要があります。原価電卓なら仕入値を1箇所直すだけで全メニューが再計算。関数崩れもコピペミスもありません。無料テンプレートより速く、レシピの原価計算が続けられます。
        </p>
        <Link href="/app" className={ctaClass({ variant: 'secondary', size: 'md', className: 'self-start' })}>
          エクセルから乗り換える
          <Icon icon={ArrowRight} size="sm" />
        </Link>
      </section>

      {/* プライバシー約束 */}
      <section aria-labelledby="privacy-heading" className="mt-16 flex flex-col gap-4">
        <h2 id="privacy-heading" className="text-h1 font-bold text-ink">
          レシピと仕入価格は、端末の外に出ません
        </h2>
        <p className="max-w-prose text-body text-ink-secondary">
          入力したデータはサーバーに送信せず、すべてブラウザ内（localStorage）で完結します。POS導入もアカウント登録も不要。営業秘密であるレシピと原価が外部に漏れる心配がありません。
        </p>
        <div className="flex items-center gap-4">
          <TrustBadge />
          <Link href="/legal/privacy" className="text-body-sm text-primary-ink underline underline-offset-2">
            プライバシーポリシー
          </Link>
        </div>
      </section>

      {/* 料金ティザー */}
      <section aria-labelledby="pricing-teaser-heading" className="mt-16 flex flex-col gap-6">
        <h2 id="pricing-teaser-heading" className="text-h1 font-bold text-ink">
          無料で始めて、必要になったら Pro
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <h3 className="text-h3 font-bold text-ink">Free</h3>
            <ul className="flex flex-col gap-2 text-body-sm text-ink-secondary">
              {['メニュー3件まで', '原価・原価率・粗利の自動計算', '仕入値1つで全再計算', '値上げシミュレーション（単品）', '原価率アラート', 'JSONバックアップ／復元'].map(
                (item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Icon icon={Check} size="sm" title="対応" className="mt-0.5 text-good-fg" />
                    <span>{item}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-pro bg-pro-subtle p-6">
            <div className="flex items-center gap-2">
              <h3 className="text-h3 font-bold text-ink">Pro</h3>
              <Badge tone="pro">¥980/月〜</Badge>
            </div>
            <ul className="flex flex-col gap-2 text-body-sm text-ink-secondary">
              {['メニュー無制限', '値上げシミュレーション一括適用', 'CSV・PDF 出力', 'Free の全機能'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon icon={Check} size="sm" title="対応" className="mt-0.5 text-pro" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/pricing" className={ctaClass({ size: 'md' })}>
            料金を見る
          </Link>
          <Link href="/app" className={ctaClass({ variant: 'secondary', size: 'md' })}>
            無料で使ってみる
          </Link>
        </div>
      </section>

      {/* FAQ 抜粋 */}
      <section aria-labelledby="faq-heading" className="mt-16 flex flex-col gap-6">
        <h2 id="faq-heading" className="text-h1 font-bold text-ink">
          よくある質問
        </h2>
        <FaqAccordion items={LANDING_FAQ} />
        <Link href="/faq" className="text-body-sm text-primary-ink underline underline-offset-2">
          すべての質問を見る
        </Link>
      </section>

      {/* 最終 CTA */}
      <section className="mt-16 flex flex-col items-center gap-5 rounded-lg bg-primary px-6 py-12 text-center">
        <h2 className="max-w-2xl text-h1 font-bold text-white">今すぐ、仕入れ値を1つ動かしてみる</h2>
        <p className="max-w-xl text-body text-primary-onnavy">{HERO_SUB}</p>
        <Link href="/app" className={ctaClass({ variant: 'secondary', size: 'lg' })}>
          無料で使ってみる
          <Icon icon={ArrowRight} size="sm" />
        </Link>
        <p className="text-body-sm text-primary-onnavy">登録不要・データは端末内のみ</p>
      </section>
    </MarketingTemplate>
  )
}
