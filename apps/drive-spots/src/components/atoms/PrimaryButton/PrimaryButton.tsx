import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type PrimaryButtonProps = {
  children: ReactNode
  onClick: () => void
  /**
   * 'accent' = 保存する, 'done' = 行った！にする (blue), 'outline' = 「行きたい」に戻す.
   */
  tone: 'accent' | 'done' | 'outline'
}

const TONE_CLASS_NAMES: Record<PrimaryButtonProps['tone'], string> = {
  accent: 'bg-accent text-17 text-canvas',
  done: 'bg-done text-17 text-canvas',
  outline: 'border border-edge-chip bg-transparent text-16 text-ink',
}

/** Full-width 56px action button. Icons passed as children sit left of the text. */
export function PrimaryButton({ children, onClick, tone }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick()}
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-bold',
        TONE_CLASS_NAMES[tone],
      )}
    >
      {children}
    </button>
  )
}
