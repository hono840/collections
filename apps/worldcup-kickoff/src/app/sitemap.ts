import type { MetadataRoute } from 'next'
import { getRepository } from '@/lib/data'

/**
 * サイトマップ。検索エンジンに全ルートを提示する。
 * - 静的ルート（トップ・各機能ページ）
 * - 動的ルート: 48ヶ国 /countries/[code]、各ルールレッスン /rules/[slug]
 *
 * baseUrl は NEXT_PUBLIC_SITE_URL を優先し、未設定時は Vercel の既定ドメインを使う。
 */
const baseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worldcup-kickoff.vercel.app'
).replace(/\/$/, '')

/** トップを起点に主要機能を列挙した静的ルート */
const STATIC_ROUTES = [
  '/',
  '/matches',
  '/bracket',
  '/countries',
  '/diagnosis',
  '/rules',
  '/glossary',
  '/predictions',
] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = getRepository()
  const [teams, lessons] = await Promise.all([
    repo.getTeams(),
    repo.getRuleLessons(),
  ])

  const lastModified = new Date()

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }))

  const countryEntries: MetadataRoute.Sitemap = teams.map((team) => ({
    url: `${baseUrl}/countries/${team.code}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const ruleEntries: MetadataRoute.Sitemap = lessons.map((lesson) => ({
    url: `${baseUrl}/rules/${lesson.slug}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticEntries, ...countryEntries, ...ruleEntries]
}
