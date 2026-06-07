import { cn } from '@/lib/utils/cn'

export interface SpecProps {
  /** 表示文字列（"152 N·m (15.5 kgf·m)" のような併記を許容） */
  value: string
  className?: string
}

/**
 * 諸元値の最小表示単位（atom）。
 * 等幅・等角（tabular-nums）で図面/計器の言語に揃える。
 */
export function Spec({ value, className }: SpecProps) {
  return <span className={cn('ck-num text-ck-text', className)}>{value}</span>
}
