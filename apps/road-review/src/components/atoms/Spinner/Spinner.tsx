import { cn } from '@/lib/utils/cn'

export type SpinnerProps = {
  /** Visually hidden text read by screen readers. */
  label?: string
  className?: string
}

export function Spinner({ label = '読み込み中', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <span
        aria-hidden="true"
        className="size-5 rounded-full border-2 border-line border-t-primary motion-safe:animate-spin"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
