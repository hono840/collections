/**
 * 料金ページ（/pricing）— Server Component + 小 client island（architecture §8.1 / §9.1, PRD 11.2）。
 * PricingTable（プラン切替 + 価格 + Stripe 導線）と LicenseApplyIsland（購入済みキー入力）は client。
 * 特商法／プライバシーへのリンクと購入系 FAQ 抜粋を併設する。
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { PRICING_FAQ } from '@/lib/content/faq'
import { PricingTable } from '@/components/organisms/PricingTable'
import { LicenseApplyIsland } from '@/components/organisms/LicenseApplyIsland'
import { FaqAccordion } from '@/components/organisms/FaqAccordion'
import { MarketingTemplate } from '@/components/templates/MarketingTemplate'

export const metadata: Metadata = {
  title: '料金',
  description:
    '原価電卓の料金プラン。無料でメニュー3件・原価計算・値上げシミュレーション・原価率アラートまで。Proは月額¥980／年額¥9,800でメニュー無制限・CSV/PDF出力・値上げ一括適用。',
  alternates: { canonical: '/pricing' },
}

export default function PricingPage() {
  return (
    <MarketingTemplate>
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1 font-bold text-ink sm:text-hero">料金</h1>
          <p className="text-body text-ink-secondary">
            まずは無料で。メニューが増えたり、CSV/PDF 出力・値上げの一括適用が必要になったら Pro へ。
          </p>
        </div>

        <PricingTable />

        <LicenseApplyIsland />

        <p className="text-body-sm text-ink-secondary">
          ご購入の前に{' '}
          <Link href="/legal/tokushoho" className="text-primary-ink underline underline-offset-2">
            特定商取引法に基づく表記
          </Link>{' '}
          と{' '}
          <Link href="/legal/privacy" className="text-primary-ink underline underline-offset-2">
            プライバシーポリシー
          </Link>{' '}
          をご確認ください。
        </p>

        <section aria-labelledby="pricing-faq-heading" className="flex flex-col gap-6">
          <h2 id="pricing-faq-heading" className="text-h1 font-bold text-ink">
            料金・購入に関するよくある質問
          </h2>
          <FaqAccordion items={PRICING_FAQ} />
          <Link href="/faq" className="text-body-sm text-primary-ink underline underline-offset-2">
            すべての質問を見る
          </Link>
        </section>
      </div>
    </MarketingTemplate>
  )
}
