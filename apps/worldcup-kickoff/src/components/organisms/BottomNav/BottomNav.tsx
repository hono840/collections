'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Trophy, Flag, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NavItem {
  href: string
  label: string
  icon: typeof Home
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/matches', label: '日程', icon: Calendar },
  { href: '/bracket', label: 'ブラケット', icon: Trophy },
  { href: '/countries', label: '国図鑑', icon: Flag },
  { href: '/rules', label: '学ぶ', icon: BookOpen },
] as const

/** 現在地判定。ルートは完全一致、それ以外は前方一致（配下ページもハイライト） */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * モバイル下部ナビ。`fixed bottom-0`・高さ 64px(h-16)・中央 max-w-[480px]。
 * 5項目（ホーム/日程/ブラケット/国図鑑/学ぶ）。`usePathname` で現在地をハイライトし
 * `aria-current="page"` を付与。各リンクは 44px 以上のタップ領域を確保。
 * layout の `pb-16` と対応。Client Component（usePathname）。
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm"
    >
      <ul className="mx-auto flex h-16 w-full max-w-[480px] items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActiveRoute(pathname, item.href)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors',
                  active
                    ? 'text-pitch-700'
                    : 'text-text-muted hover:text-text',
                )}
              >
                <Icon
                  className={cn('h-5 w-5', active && 'fill-pitch-100')}
                  aria-hidden
                />
                <span className="text-[10px] font-bold leading-tight">
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {/* ホームインジケータ用セーフエリア */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
