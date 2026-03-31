import { cn } from '@/lib/utils/cn'

export type BadgeColor = 'gray' | 'red' | 'amber' | 'emerald' | 'brand'

export interface BadgeProps {
  children: React.ReactNode
  /** 色バリアント */
  color?: BadgeColor
  className?: string
}

const colorStyles: Record<BadgeColor, string> = {
  gray: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500',
}

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        colorStyles[color],
        className
      )}
    >
      {children}
    </span>
  )
}
