import { Clock } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'

export interface DaysRemainingBadgeProps {
  /** 表示月の残り日数 */
  days: number
  /** 表示月が現在のカレンダー月かどうか */
  isCurrentMonth: boolean
}

export function DaysRemainingBadge({
  days,
  isCurrentMonth,
}: DaysRemainingBadgeProps) {
  if (!isCurrentMonth) {
    return <Badge color="gray">過去の月</Badge>
  }

  const color = days <= 3 ? 'red' : days <= 7 ? 'amber' : 'emerald'

  return (
    <Badge color={color}>
      <Clock className="h-3 w-3" />
      残り{days}日
    </Badge>
  )
}
