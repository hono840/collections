import { cn } from '@/lib/utils/cn'

export type SkeletonShape = 'text' | 'rect' | 'circle'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 形状 */
  shape?: SkeletonShape
}

const shapeStyles: Record<SkeletonShape, string> = {
  text: 'h-4 w-full rounded',
  rect: 'rounded-2xl',
  circle: 'rounded-full',
}

/**
 * ローディングプレースホルダ。pulse アニメーション。
 * 装飾要素のため aria-hidden。サイズは className で上書きする。Server Component。
 */
export function Skeleton({
  shape = 'text',
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse bg-border',
        shapeStyles[shape],
        className,
      )}
      {...props}
    />
  )
}
