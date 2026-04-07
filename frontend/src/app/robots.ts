import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_BRAND_URL || 'https://qorstack.dev'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/create-project', '/settings', '/api-keys']
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  }
}
