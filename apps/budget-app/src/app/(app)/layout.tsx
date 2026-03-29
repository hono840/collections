import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ToastProvider } from '@/components/ui/toast'

async function UserNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <Sidebar userEmail={user.email ?? ''} />
      </aside>

      {/* Mobile bottom nav - hidden on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <BottomNav />
      </div>
    </>
  )
}

function NavSkeleton() {
  return (
    <>
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-1 flex-col bg-white px-4 py-6 dark:bg-zinc-800">
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-zinc-700" />
          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-slate-200 dark:bg-zinc-700"
              />
            ))}
          </nav>
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="flex h-16 items-center justify-around bg-white dark:bg-zinc-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-zinc-700"
            />
          ))}
        </div>
      </div>
    </>
  )
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="min-h-dvh">
        <Suspense fallback={<NavSkeleton />}>
          <UserNav />
        </Suspense>

        {/* Main content area */}
        <main className="pb-20 md:pl-64 md:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
