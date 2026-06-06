import { Chip } from '@/components/atoms/Chip'
import { cn } from '@/lib/utils/cn'

export interface QuizOptionProps {
  /** 選択肢の表示ラベル */
  label: string
  /** 選択中かどうか（aria-pressed に反映） */
  selected?: boolean
  /** クリックハンドラ（上位の診断状態を更新） */
  onClick?: () => void
  /** 任意の先頭アイコン/絵文字（装飾） */
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * 推し国診断の1選択肢。Chip をベースに、フル幅・左寄せの大きめタップ領域にしたもの。
 * 状態は上位（DiagnosisQuiz）が持ち、props で受け取る dumb なトグルボタン。
 */
export function QuizOption({
  label,
  selected = false,
  onClick,
  icon,
  disabled = false,
  className,
}: QuizOptionProps) {
  return (
    <Chip
      selected={selected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-[52px] w-full justify-start gap-3 rounded-2xl px-4 text-left text-base',
        className,
      )}
    >
      {icon != null ? (
        <span className="inline-flex shrink-0 text-xl" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">{label}</span>
    </Chip>
  )
}
