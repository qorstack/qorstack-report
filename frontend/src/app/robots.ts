import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://report.qorstack.com'

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

// Static export: generated once at build time.
export const dynamic = 'force-static'
