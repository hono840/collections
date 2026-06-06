import type { MetadataRoute } from 'next'

/**
 * robots.txt。全クローラに全ページを許可し、サイトマップの場所を伝える。
 * baseUrl は sitemap.ts と同じく NEXT_PUBLIC_SITE_URL を優先する。
 */
const baseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldcup-kickoff.vercel.app'
).replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
