import { format, formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

export function formatCurrency(amount: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount)
}

export function formatDate(date: string | Date, pattern = 'yyyy/MM/dd'): string {
  return format(new Date(date), pattern, { locale: ja })
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ja })
}

export function formatMonthYear(date: string | Date): string {
  return format(new Date(date), 'yyyy年M月', { locale: ja })
}
