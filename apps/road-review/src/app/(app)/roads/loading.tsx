import { Spinner } from '@/components/atoms/Spinner'

/** Skeleton for the roads segment (UX S-05: three skeleton rows). */
export default function RoadsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-40 rounded-sm bg-surface-sunken" aria-hidden="true" />
      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-28 rounded-md border border-line bg-surface-raised motion-safe:animate-pulse" />
        ))}
      </div>
      <Spinner />
    </div>
  )
}
