/**
 * CTA リンク用クラスビルダー。
 *
 * マーケ/法務ページの主要 CTA は「ボタン見た目のリンク（<a> / <Link>）」であるべきで、
 * Button atom（<button>）はナビゲーション用途に不適。ここでは Button の primary/secondary の
 * トークンを厳密にミラーし、リンクにボタンの意匠を与える（意味論は anchor のまま保つ）。
 * design-spec §2.2 / §2.8。ハードコード hex は使わずトークンクラスのみ。
 */
import { cn } from './cn'

export type CtaVariant = 'primary' | 'secondary'
export type CtaSize = 'md' | 'lg'

const VARIANT: Record<CtaVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed',
  secondary: 'bg-surface text-primary-ink border border-border-strong hover:bg-surface-sunken',
}

const SIZE: Record<CtaSize, string> = {
  md: 'min-h-[var(--tap-min)] px-4 text-label',
  lg: 'min-h-[56px] px-5 text-body',
}

export interface CtaClassOptions {
  variant?: CtaVariant
  size?: CtaSize
  fullWidth?: boolean
  className?: string
}

/** ボタン意匠のリンク用クラス文字列を返す（Button atom の見た目と一致）。 */
export function ctaClass({ variant = 'primary', size = 'md', fullWidth = false, className }: CtaClassOptions = {}): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium transition-colors',
    VARIANT[variant],
    SIZE[size],
    fullWidth && 'w-full',
    className,
  )
}
