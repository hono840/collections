import type { MetadataRoute } from 'next'
import { getAllCarParams } from '@/features/cars/data'
import { getGlossarySlugs } from '@/features/glossary/data'

const BASE = 'https://carskiida.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cars, terms] = await Promise.all([
    getAllCarParams(),
    getGlossarySlugs(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/search`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/glossary`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const carRoutes: MetadataRoute.Sitemap = cars.map((c) => ({
    url: `${BASE}/cars/${c.manufacturer}/${c.model}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const termRoutes: MetadataRoute.Sitemap = terms.map((t) => ({
    url: `${BASE}/glossary/${t.slug}`,
    changeFrequency: 'yearly',
    priority: 0.3,
  }))

  return [...staticRoutes, ...carRoutes, ...termRoutes]
}
