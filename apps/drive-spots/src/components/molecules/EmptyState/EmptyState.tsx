import type { ReactNode } from 'react'
import { Icon } from '@/components/atoms/Icon'

type EmptyStateProps = {
  title: string
  description: ReactNode
}

/** Shown when the tab × category combination has no spots (AC5). */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-3 py-12 text-center text-ink-muted">
      <Icon name="road" size={40} strokeWidth={1.6} className="text-ink-dim" />
      <p className="text-15 font-bold text-ink">{title}</p>
      <p className="text-13 leading-note">{description}</p>
    </div>
  )
}
