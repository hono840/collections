import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { signOut } from '@/features/auth/actions'

/** App bar for signed-in pages: app name (home link) + logout. Server Component. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-14 max-w-300 items-center justify-between gap-4 px-4 md:px-5 lg:px-6">
        <Link
          href="/roads"
          className="heading-mincho inline-flex min-h-11 items-center text-xl text-ink"
        >
          公道レビュー
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut aria-hidden="true" className="size-4" />
            ログアウト
          </Button>
        </form>
      </div>
    </header>
  )
}
