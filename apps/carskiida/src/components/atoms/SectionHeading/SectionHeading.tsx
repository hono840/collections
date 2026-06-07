import { cn } from '@/lib/utils/cn'

export interface SectionHeadingProps {
  /** 日本語見出し */
  children: React.ReactNode
  /** 英字ラベル（製図の見出しの所作。大文字＋字間広め） */
  label?: string
  className?: string
}

/**
 * セクション見出し（atom）。日本語見出し + 英字キャプスの併記を所作にする。
 */
export function SectionHeading({
  children,
  label,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('mb-3 flex items-baseline gap-3', className)}>
      <h2 className="text-xl text-ck-text">{children}</h2>
      {label && (
        <span className="ck-num text-xs uppercase tracking-widest text-ck-text-muted">
          {label}
        </span>
      )}
    </div>
  )
}
