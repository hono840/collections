'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const root = document.documentElement

  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches
    if (prefersDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

const themeOptions = [
  { value: 'light' as const, icon: Sun, label: 'ライト' },
  { value: 'dark' as const, icon: Moon, label: 'ダーク' },
  { value: 'system' as const, icon: Monitor, label: 'システム' },
]

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  // Read stored theme on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setTheme(stored)
    }
    setMounted(true)
  }, [])

  // Apply theme whenever it changes
  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  // Listen for system preference changes when in "system" mode
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      if (theme === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  // Avoid hydration mismatch - render a placeholder until mounted
  if (!mounted) {
    return (
      <div className="flex h-9 items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-zinc-700">
        {themeOptions.map((option) => (
          <div key={option.value} className="h-7 w-7 rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-zinc-700"
      role="radiogroup"
      aria-label="テーマ切替"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon
        const isSelected = theme === option.value

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              isSelected
                ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}
