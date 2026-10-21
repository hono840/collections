/**
 * Toast — transient notification (design-spec §8.2). Server-compatible.
 * role=status (polite live region) with a tone icon so it is not colour-only; optional inline
 * action and a close control. Navy/green/red solid grounds with white ink (verified contrast).
 */
import type { LucideIcon } from 'lucide-react'
import { Info, CircleCheck, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'
import { IconButton } from '@/components/atoms/IconButton'

export type ToastTone = 'info' | 'success' | 'danger'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps {
  message: string
  tone?: ToastTone
  action?: ToastAction
  onClose?: () => void
  className?: string
}

const TONE: Record<ToastTone, { ground: string; icon: LucideIcon }> = {
  info: { ground: 'bg-primary text-white', icon: Info },
  success: { ground: 'bg-good-solid text-white', icon: CircleCheck },
  danger: { ground: 'bg-danger-solid text-white', icon: TriangleAlert },
}

export function Toast({ message, tone = 'info', action, onClose, className }: ToastProps) {
  const t = TONE[tone]
  return (
    <div role="status" className={cn('flex items-center gap-3 rounded-md px-4 py-3 shadow-lg', t.ground, className)}>
      <Icon icon={t.icon} size="sm" />
      <span className="text-body-sm flex-1">{message}</span>
      {action && (
        <button type="button" onClick={action.onClick} className="text-label shrink-0 underline">
          {action.label}
        </button>
      )}
      {onClose && (
        <IconButton
          icon={X}
          label="閉じる"
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="text-white hover:bg-white/15"
        />
      )}
    </div>
  )
}
