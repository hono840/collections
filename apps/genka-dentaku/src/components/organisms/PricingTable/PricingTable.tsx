'use client'
/**
 * PricingTable — Free/Pro 比較 + 価格 + Stripe 導線（design-spec §4.5 / §8.3, PRD 5.1 / 11.2）。
 * Client（PlanToggle の cycle 状態と価格・Stripe リンクの切替を持つ）。
 *
 * ゲーティング表は PRD 5.1 / architecture §7.2 に一致（JSONバックアップ=Free, 原価率アラート=Free）。
 * ヘッダーの Pro 価値訴求は CPO 指摘に従い「Pro 限定」機能のみを挙げる（原価率アラートは Free のため掲載しない）。
 * 購入導線は Stripe Payment Link を env で駆動し、未設定時は '#' + 「準備中」にフォールバックする。
 */
import { useState } from 'react'
import { Check } from 'lucide-react'
import { PRICE_MONTHLY, PRICE_ANNUAL } from '@/lib/constants/plans'
import { formatYen } from '@/lib/utils/format'
import { ctaClass } from '@/lib/utils/cta'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { PlanToggle, type BillingCycle } from '@/components/molecules/PlanToggle'
import { PlanFeatureRow, type PlanFeatureRowProps } from '@/components/molecules/PlanFeatureRow'
import { TrustBadge } from '@/components/molecules/TrustBadge'

/** 比較表の行（design-spec §4.5 の表と一致・目玉行は Pro 限定機能）。 */
const FEATURE_ROWS: PlanFeatureRowProps[] = [
  { feature: 'メニュー登録', free: '3件まで', pro: '無制限' },
  { feature: '保存（端末内）', free: true, pro: true },
  { feature: 'JSONバックアップ／復元', free: true, pro: true },
  { feature: 'ライブ再計算', free: true, pro: true },
  { feature: '値上げシミュレーション（単品）', free: true, pro: true },
  { feature: '値上げシミュレーション（一括適用）', free: false, pro: true, highlight: true },
  { feature: 'PDF / CSV 出力', free: false, pro: true, highlight: true },
  { feature: '原価率アラート（信号色＋悪い順ダッシュボード）', free: true, pro: true },
]

/** ヘッダーで訴求する「Pro 限定」価値（原価率アラートは Free のため含めない・CPO 指摘）。 */
const PRO_VALUE_PROPS = [
  '値上げシミュレーションの一括適用（全メニューを一度に）',
  'レシピ（メニュー）無制限',
  'CSV・PDF 出力（原価表・レポート）',
]

export interface PricingTableProps {
  /** 既定選択サイクル（主 CTA は年額・design-spec §4.5）。 */
  defaultCycle?: BillingCycle
  className?: string
}

export function PricingTable({ defaultCycle = 'annual', className }: PricingTableProps) {
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle)
  const isAnnual = cycle === 'annual'
  const price = isAnnual ? PRICE_ANNUAL : PRICE_MONTHLY
  const priceUnit = isAnnual ? '/年' : '/月'

  // NEXT_PUBLIC_* はビルド時にインライン置換されるため、算出キーではなく静的アクセスで参照する。
  const stripeLink = isAnnual
    ? process.env.NEXT_PUBLIC_STRIPE_LINK_ANNUAL
    : process.env.NEXT_PUBLIC_STRIPE_LINK_MONTHLY
  const ready = typeof stripeLink === 'string' && stripeLink.length > 0

  return (
    <section className={cn('flex flex-col gap-8', className)} aria-labelledby="pricing-heading">
      {/* ヘッダー: Pro 価値訴求 + TrustBadge */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 id="pricing-heading" className="text-h1 font-bold text-ink">
            原価電卓 Pro
          </h2>
          <Badge tone="pro">PRO</Badge>
        </div>
        <ul className="flex flex-col gap-2">
          {PRO_VALUE_PROPS.map((value) => (
            <li key={value} className="flex items-start gap-2 text-body text-ink-secondary">
              <Icon icon={Check} size="sm" title="Pro 限定" className="mt-1 text-pro" />
              <span>{value}</span>
            </li>
          ))}
        </ul>
        <TrustBadge />
      </div>

      {/* プラン切替 + 価格カード */}
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <PlanToggle cycle={cycle} onChange={setCycle} />
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-1">
            <span className="font-num text-hero font-bold text-ink" aria-live="polite">
              {formatYen(price)}
            </span>
            <span className="text-h3 text-ink-secondary">{priceUnit}</span>
          </p>
          <p className="text-body-sm text-ink-secondary">
            {isAnnual ? '実質 ¥817/月・2ヶ月分お得' : 'いつでも解約できます'}
          </p>
        </div>

        {ready ? (
          <a
            href={stripeLink}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass({ size: 'lg', fullWidth: true })}
          >
            Proにアップグレード
          </a>
        ) : (
          <a
            href="#"
            aria-disabled="true"
            tabIndex={-1}
            title="決済リンクは準備中です"
            className={ctaClass({ size: 'lg', fullWidth: true, className: 'pointer-events-none opacity-60' })}
          >
            準備中
          </a>
        )}
      </div>

      {/* 比較表 */}
      <div>
        <div
          className="grid grid-cols-[1fr_4rem_4rem] items-end gap-3 pb-1 text-label font-medium text-ink-secondary"
          aria-hidden="true"
        >
          <span>機能</span>
          <span className="text-center">Free</span>
          <span className="text-center text-primary-ink">Pro</span>
        </div>
        <div>
          {FEATURE_ROWS.map((row) => (
            <PlanFeatureRow key={row.feature} {...row} />
          ))}
        </div>
      </div>
    </section>
  )
}
