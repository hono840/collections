/**
 * sitemap.xml（architecture §8.2）。
 * 静的エクスポート対応のため同期関数（データ取得なし）。index 対象ルートのみ掲載し、
 * /legal/* は低優先（0.2）で掲載、/app は noindex のため除外する（CTOレビュー指摘5）。
 * baseURL は NEXT_PUBLIC_SITE_URL 優先・末尾スラッシュ除去（未設定時は本番ドメイン）。
 */
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// 静的エクスポート（output: export）ではビルド時生成を明示する。
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/legal/tokushoho`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/legal/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
