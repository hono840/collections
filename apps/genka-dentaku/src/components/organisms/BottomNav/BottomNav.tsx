'use client'
/**
 * BottomNav — the thumb-reachable 3-tab bar (design-spec §3 / §8.3): ダッシュボード / 食材 / 設定.
 * Active tab is navy with aria-current="page"; inactive tabs are muted. Each target is icon + label
 * (never colour-only) and at least 48px. The dashboard FAB is a separate slot owned by AppShell.
 */
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Carrot, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/atoms/Icon'

export type NavTab = 'dashboard' | 'ingredients' | 'settings'

interface NavItem {
  tab: NavTab
  label: string
  icon: LucideIcon
}

const ITEMS: NavItem[] = [
  { tab: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { tab: 'ingredients', label: '食材', icon: Carrot },
  { tab: 'settings', label: '設定', icon: Settings },
]

export interface BottomNavProps {
  active: NavTab
  onNavigate: (tab: NavTab) => void
  /** Disable navigation (e.g. while the recovery dialog blocks the app). */
  disabled?: boolean
  className?: string
}

export function BottomNav({ active, onNavigate, disabled = false, className }: BottomNavProps) {
  return (
    <nav
      aria-label="メインナビゲーション"
      className={cn('border-t border-border bg-surface shadow-bar', className)}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          const isActive = item.tab === active
          return (
            <li key={item.tab} className="flex-1">
              <button
                type="button"
                onClick={() => onNavigate(item.tab)}
                disabled={disabled}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-[var(--tap-min)] w-full flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                  'disabled:pointer-events-none disabled:opacity-50',
                  isActive ? 'text-primary' : 'text-ink-muted hover:text-ink-secondary',
                )}
              >
                <Icon icon={item.icon} size="md" />
                <span className="text-caption font-medium">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
