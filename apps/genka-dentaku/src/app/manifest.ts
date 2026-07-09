/**
 * Web App Manifest（architecture §8.2 / design-spec §2.2）。
 * 静的エクスポート対応の同期関数。ネイビー支配色 + 暖色オフホワイト地。start_url は
 * ツール本体（/app）。アイコンは icon.tsx / apple-icon.tsx が別途 <link> として供給する。
 */
import type { MetadataRoute } from 'next'
import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/site'

// 静的エクスポート（output: export）ではビルド時生成を明示する。
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/app',
    display: 'standalone',
    background_color: '#F4F1EB',
    theme_color: '#1E3A5F',
    lang: 'ja',
    dir: 'ltr',
    categories: ['business', 'productivity', 'food'],
  }
}
