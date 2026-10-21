/**
 * robots.txt（architecture §8.2）。
 * 静的エクスポート対応の同期関数。全許可・全 disallow なし。
 * /app はクロール可のまま各ページ側の metadata.robots で noindex にする方針（robots では塞がない）。
 */
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// 静的エクスポート（output: export）ではビルド時生成を明示する。
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
