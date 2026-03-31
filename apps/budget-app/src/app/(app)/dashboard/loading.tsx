import { Skeleton } from '@/components/atoms/Skeleton'

export default function DashboardLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Monthly summary card skeleton */}
      <div className="mb-8">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>

      {/* Category budget section skeleton */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent transactions skeleton */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
