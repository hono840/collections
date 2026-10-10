import { Alert } from '@/components/atoms/Alert'

export type SafetyNoticeBannerProps = {
  className?: string
}

/**
 * Always-on safety note at the top of the drive record form (M-01, spec 4-7).
 * A calm "info" note (role="note"), never an alert, and it cannot be dismissed.
 */
export function SafetyNoticeBanner({ className }: SafetyNoticeBannerProps) {
  return (
    <Alert
      variant="info"
      role="note"
      className={className}
      icon={
        // "P" (parking) mark: 20px square, 1.5px info border. Decorative.
        <span className="flex size-5 items-center justify-center rounded-xs border-[1.5px] border-info text-xs leading-none font-bold text-info">
          P
        </span>
      }
      title="運転中は操作しないでください"
    >
      <p className="leading-relaxed">
        記録は安全な場所に停車してから、またはドライブの後に行ってください。
      </p>
    </Alert>
  )
}
