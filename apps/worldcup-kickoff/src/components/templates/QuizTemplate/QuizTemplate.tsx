import { cn } from '@/lib/utils/cn'

export interface QuizTemplateProps {
  /** 上部の進捗表示スロット（ProgressBar 等） */
  progress?: React.ReactNode
  /** 設問・結果などの本文 */
  children: React.ReactNode
  /** 下部に固定するアクション領域（次へ/戻る等） */
  footer?: React.ReactNode
  className?: string
}

/**
 * 診断クイズ専用の没入レイアウト。
 * 通常のヘッダー/ナビを最小化し、進捗 → 設問 → アクション に集中させる。
 * データは持たず slot のみ受け取る純レイアウト。
 *
 * ── 後続担当への注意 ──
 * `progress` に ProgressBar、`children` に DiagnosisQuiz / DiagnosisResultCard、
 * `footer` に「次へ」「やり直す」等の操作ボタンを渡す。
 */
export function QuizTemplate({
  progress,
  children,
  footer,
  className,
}: QuizTemplateProps) {
  return (
    <div
      className={cn('flex min-h-[70dvh] flex-col gap-6', className)}
    >
      {progress != null && <div className="pt-2">{progress}</div>}
      <div className="flex flex-1 flex-col justify-center gap-6">
        {children}
      </div>
      {footer != null && (
        <div className="sticky bottom-16 flex flex-col gap-3">{footer}</div>
      )}
    </div>
  )
}
