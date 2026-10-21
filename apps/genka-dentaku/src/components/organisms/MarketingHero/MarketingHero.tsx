/**
 * MarketingHero — ランディングのヒーロー（design-spec §4.6 / §8.3）。
 * Server Component（静的 HTML・SEO・高速）。H1 は原文固定（architecture §8.1）。
 * 「記憶に残る一点」の予告として、before/after の原価率ピルを静的マークアップで見せる
 * （重い client JS を持たず、reduced-motion でも静止対比として成立する）。
 */
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ctaClass } from '@/lib/utils/cta'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { CostRatePill } from '@/components/molecules/CostRatePill'
import { TrustBadge } from '@/components/molecules/TrustBadge'

/** H1（原文固定・design-spec §4.6 / architecture §8.1）。 */
export const HERO_H1 = '仕入れ値を1つ直すだけで、全メニューの原価率が即再計算。'

/** サブコピー（design-spec §4.6・GTM コアコピー）。 */
export const HERO_SUB =
  '値上げシミュレーションで“原価率30%にするには何円？”がすぐわかる。POS不要・登録不要、ブラウザだけ。レシピと仕入価格は端末の外に出ません。'

export interface MarketingHeroProps {
  className?: string
}

export function MarketingHero({ className }: MarketingHeroProps) {
  return (
    <section className={cn('px-4 pt-10 pb-12 sm:pt-14 sm:pb-16', className)}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        {/* コピー列 */}
        <div className="flex flex-col gap-6">
          <p className="text-label font-medium text-primary-ink">飲食店のメニュー原価計算ツール</p>
          <h1 className="text-h1 font-bold text-ink sm:text-hero">{HERO_H1}</h1>
          <p className="max-w-prose text-body text-ink-secondary">{HERO_SUB}</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/app" className={ctaClass({ size: 'lg' })}>
              無料で使ってみる
              <Icon icon={ArrowRight} size="sm" />
            </Link>
            <Link href="/pricing" className={ctaClass({ variant: 'secondary', size: 'lg' })}>
              料金を見る
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-secondary">
            <TrustBadge />
            <span className="text-body-sm">登録不要・ブラウザだけ</span>
          </div>
        </div>

        {/* wedge ビジュアル（静的 before/after・ネイビー計器パネル） */}
        <WedgeVisual />
      </div>
    </section>
  )
}

/**
 * 静的 wedge デモ: 鶏ももの仕入値を上げると唐揚げ定食の原価率が即再計算される様子を
 * before/after の原価率ピルで示す（数値は PRD の検証例 ¥900→¥1,200・24.8%→30.9% 準拠）。
 */
function WedgeVisual() {
  return (
    <div
      aria-label="デモ: 鶏ももを900円から1,200円に更新すると、唐揚げ定食の原価率が24.8%（良好）から30.9%（注意）へ即再計算される様子"
      role="img"
      className="rounded-lg bg-primary p-6 shadow-lg sm:p-8"
    >
      <p className="text-label font-medium text-primary-onnavy">唐揚げ定食</p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-2">
          <span className="text-caption text-primary-onnavy">変更前</span>
          <CostRatePill rate={24.8} status="good" />
        </div>
        <Icon icon={ArrowRight} size="lg" className="text-primary-onnavy" />
        <div className="flex flex-col items-center gap-2">
          <span className="text-caption text-primary-onnavy">変更後</span>
          <CostRatePill rate={30.9} status="caution" />
        </div>
      </div>

      <p className="mt-6 border-t border-white/15 pt-4 text-body-sm text-primary-onnavy">
        鶏ももの仕入値を{' '}
        <span className="font-num text-white">¥900 → ¥1,200</span>{' '}
        に更新すると、使っている全メニューが即座に再計算されます。
      </p>
    </div>
  )
}
