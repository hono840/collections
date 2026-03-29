'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  BarChart3,
  Tag,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
  { href: '/transactions', label: '取引', icon: ArrowRightLeft },
  { href: '/budgets', label: '予算', icon: Wallet },
  { href: '/reports', label: 'レポート', icon: BarChart3 },
  { href: '/settings', label: '設定', icon: Settings },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="border-t border-slate-200 bg-white/95 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-800/95">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 py-2',
                isActive
                  ? 'text-brand-600 dark:text-brand-500'
                  : 'text-slate-400 dark:text-zinc-500'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
