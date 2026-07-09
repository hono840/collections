'use client'
/**
 * UpgradeGateBanner — the non-aggressive Pro gate, shown inline at the action position rather than
 * as a full-screen block (design-spec §7 / PRD 5.2). Covers the Free menu limit and the Pro-only
 * feature locks (CSV / PDF / bulk simulation). Gold Lock + PRO badge are the Pro mark; the CTA is
 * navy for consistency and links to the pricing page. The annual plan is the 主CTA (裁定1).
 *
 * The gating DECISION lives in the caller (useLicense in AppRoot); this component only renders the
 * appropriate reason + copy. Existing data is always safe — that reassurance is stated for the limit.
 */
import { Lock } from 'lucide-react'
import { PRICE_ANNUAL, PRICE_MONTHLY } from '@/lib/constants/plans'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'

export type GateReason = 'free-limit' | 'export-csv' | 'export-pdf' | 'bulk-simulation'

const COPY: Record<GateReason, { title: string; description: string }> = {
  'free-limit': {
    title: 'メニューは3件までです',
    description:
      '無料プランで作成できるメニューは3件まで（サンプルを含む）。Proにするとレシピを無制限に作成できます。今ある3件は消えません。',
  },
  'export-csv': {
    title: 'CSV出力はProです',
    description: 'メニュー・食材・原価計算書を、Excelでそのまま開けるCSVに出力できます。',
  },
  'export-pdf': {
    title: 'PDF出力はProです',
    description: '原価率レポートや原価計算書を印刷用に出せます。厨房掲示や税理士提出に。',
  },
  'bulk-simulation': {
    title: '一括値上げはProです',
    description: '目標原価率を全メニューへ一括で当てて、推奨売価をまとめて見直せます。',
  },
}

export interface UpgradeGateBannerProps {
  reason: GateReason
  onDismiss?: () => void
  /** free-limit: jump to managing existing menus. */
  onManageMenus?: () => void
  /** free-limit: clear the sample menu to free a slot. */
  onClearSamples?: () => void
  hasSamples?: boolean
  pricingHref?: string
  className?: string
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

export function UpgradeGateBanner({
  reason,
  onDismiss,
  onManageMenus,
  onClearSamples,
  hasSamples = false,
  pricingHref = '/pricing',
  className,
}: UpgradeGateBannerProps) {
  const copy = COPY[reason]
  return (
    <div role="note" className={cn('rounded-md border border-border bg-pro-subtle p-4', className)}>
      <div className="flex items-center gap-2">
        <Icon icon={Lock} size="sm" className="text-pro-ink" />
        <span className="text-h3 text-ink">{copy.title}</span>
        <Badge tone="pro">PRO</Badge>
      </div>
      <p className="text-body-sm mt-1 text-ink-secondary">{copy.description}</p>
      <p className="text-caption mt-1 text-ink-muted">
        {yen(PRICE_ANNUAL)}/年（月あたり約817円）または {yen(PRICE_MONTHLY)}/月
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={pricingHref}
          className="text-label inline-flex min-h-[var(--tap-min)] items-center justify-center rounded-md bg-primary px-4 font-medium text-white hover:bg-primary-hover"
        >
          Proにアップグレード
        </a>
        {onDismiss && (
          <Button variant="ghost" onClick={onDismiss}>
            あとで
          </Button>
        )}
      </div>

      {reason === 'free-limit' && (onManageMenus || (hasSamples && onClearSamples)) && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3">
          {onManageMenus && (
            <button type="button" onClick={onManageMenus} className="text-label text-primary-ink underline">
              既存メニューを削除して枠を空ける
            </button>
          )}
          {hasSamples && onClearSamples && (
            <button type="button" onClick={onClearSamples} className="text-label text-primary-ink underline">
              サンプルを削除して枠を空ける
            </button>
          )}
        </div>
      )}
    </div>
  )
}
