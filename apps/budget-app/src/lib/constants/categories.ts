export type DefaultCategory = {
  name: string
  icon: string
  color: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: '食費', icon: 'utensils', color: '#ef4444' },
  { name: '交通費', icon: 'car', color: '#f97316' },
  { name: '住居費', icon: 'home', color: '#eab308' },
  { name: '光熱費', icon: 'zap', color: '#84cc16' },
  { name: '娯楽費', icon: 'gamepad-2', color: '#22c55e' },
  { name: '買い物', icon: 'shopping-bag', color: '#14b8a6' },
  { name: '医療費', icon: 'heart-pulse', color: '#06b6d4' },
  { name: '教育費', icon: 'graduation-cap', color: '#3b82f6' },
  { name: '個人費', icon: 'user', color: '#6366f1' },
  { name: '贈答費', icon: 'gift', color: '#8b5cf6' },
  { name: '旅行費', icon: 'plane', color: '#a855f7' },
  { name: 'その他', icon: 'circle', color: '#64748b' },
]
