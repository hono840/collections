import type { Metadata } from 'next'
import { AppRoot } from './AppRoot'

/**
 * /app — the tool SPA (architecture §8.1). A thin Server wrapper that sets metadata and renders the
 * client island. noindex: this route is a stateful SPA with no SEO content (§8.1 / §8.2).
 */
export const metadata: Metadata = {
  title: '原価計算ツール',
  robots: { index: false },
}

export default function AppPage() {
  return <AppRoot />
}
