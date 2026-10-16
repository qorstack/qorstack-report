import type { MetadataRoute } from 'next'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Qorstack Report'

const manifest = (): MetadataRoute.Manifest => ({
  name: BRAND_NAME,
  short_name: 'Qorstack',
  description: 'Turn Word and Excel templates into PDF, DOCX and XLSX with one API call. Self-hosted.',
  start_url: '/',
  display: 'standalone',
  background_color: '#070707',
  theme_color: '#070707',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
})

export default manifest

// Static export: generated once at build time.
export const dynamic = 'force-static'
