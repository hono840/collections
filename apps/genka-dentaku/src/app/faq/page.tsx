/**
 * FAQ ページ（/faq）— Server Component・静的（PRD 11.5）。
 * 全質問を FaqAccordion で表示し、FAQPage 構造化データをインラインする。
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { FAQ_ITEMS } from '@/lib/content/faq'
import { jsonLdString } from '@/lib/site'
import { ctaClass } from '@/lib/utils/cta'
import { FaqAccordion } from '@/components/organisms/FaqAccordion'
import { MarketingTemplate } from '@/components/templates/MarketingTemplate'

export const metadata: Metadata = {
  title: 'よくある質問',
  description:
    '原価電卓のよくある質問。登録・インストール不要、データは端末内のみで外部送信なし、無料とProの違い、解約・返金、ライセンスキー、税抜/税込、オフライン利用などにお答えします。',
  alternates: { canonical: '/faq' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export default function FaqPage() {
  return (
    <MarketingTemplate>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd) }} />
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-ink sm:text-hero">よくある質問</h1>
          <p className="text-body text-ink-secondary">
            原価電卓の使い方・データの扱い・料金についてよくいただく質問をまとめました。
          </p>
        </div>

        <FaqAccordion items={FAQ_ITEMS} />

        <div className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body text-ink">まずは無料で、価格を1つ動かす体験を。</p>
          <Link href="/app" className={ctaClass({ size: 'md' })}>
            無料で使ってみる
          </Link>
        </div>
      </div>
    </MarketingTemplate>
  )
}
