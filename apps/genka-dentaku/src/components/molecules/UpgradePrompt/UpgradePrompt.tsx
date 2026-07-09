/**
 * UpgradePrompt — non-aggressive Pro gate copy with a gold lock + CTA (design-spec §7 / §8.2).
 * Server-compatible and props-only (no license hook): the parent wires `onUpgrade` / navigation.
 * Gold is the Pro mark only; the CTA itself stays navy for consistency.
 */
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'

export interface UpgradePromptProps {
  /** Short value line, e.g. 「今すぐ全メニューの原価表をPDFで出せます」. */
  description?: string
  title?: string
  ctaLabel?: string
  onUpgrade?: () => void
  /** Optional pricing link shown as a secondary text link. */
  pricingHref?: string
  pricingLabel?: string
  onDismiss?: () => void
  className?: string
}

export function UpgradePrompt({
  description,
  title = 'この機能はProです',
  ctaLabel = 'Proにする',
  onUpgrade,
  pricingHref,
  pricingLabel = '料金を見る',
  onDismiss,
  className,
}: UpgradePromptProps) {
  return (
    <div className={cn('rounded-md border border-border bg-pro-subtle p-4', className)}>
      <div className="flex items-center gap-2">
        <Icon icon={Lock} size="sm" className="text-pro-ink" />
        <span className="text-h3 text-ink">{title}</span>
        <Badge tone="pro">PRO</Badge>
      </div>
      {description && <p className="text-body-sm mt-1 text-ink-secondary">{description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={onUpgrade}>{ctaLabel}</Button>
        {pricingHref && (
          <a href={pricingHref} className="text-label text-primary-ink underline">
            {pricingLabel}
          </a>
        )}
        {onDismiss && (
          <Button variant="ghost" onClick={onDismiss}>
            あとで
          </Button>
        )}
      </div>
    </div>
  )
}
