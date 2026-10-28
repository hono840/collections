import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type PrimaryButtonProps = {
  children: ReactNode
  onClick: () => void
  /**
   * 'accent' = 保存する, 'done' = 行った！にする (blue), 'outline' = 「行きたい」に戻す,
   * 'danger' = 置き換える (the outline shape in the danger color, not filled; docs/design/backup.md).
   */
  tone: 'accent' | 'done' | 'outline' | 'danger'
  /** A native disabled button: not pressable, not focusable, dimmed with a not-allowed cursor. */
  disabled?: boolean
}

const TONE_CLASS_NAMES: Record<PrimaryButtonProps['tone'], string> = {
  accent: 'bg-accent text-17 text-canvas',
  done: 'bg-done text-17 text-canvas',
  outline: 'border border-edge-chip bg-transparent text-16 text-ink',
  danger: 'border border-danger bg-transparent text-16 text-danger',
}

/** Full-width 56px action button. Icons passed as children sit left of the text. */
export function PrimaryButton({ children, onClick, tone, disabled = false }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick()}
      disabled={disabled}
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-bold disabled:cursor-not-allowed disabled:opacity-40',
        TONE_CLASS_NAMES[tone],
      )}
    >
      {children}
    </button>
  )
}
