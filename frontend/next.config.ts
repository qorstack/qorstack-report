import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { NextConfig } from 'next'

// Marketing-only deploy (Vercel): the backend-dependent routes are stripped by
// scripts/prepare-marketing-build.mjs. Their CTAs redirect to the landing page.
// NOTE: kept independent of NEXT_PUBLIC_APP_URL on purpose — pointing that var at the
// marketing domain itself caused a /login → /login self-redirect loop (ERR_TOO_MANY_REDIRECTS).
// When the real app is live on a separate domain (e.g. app.qorstack.com), point these there.
const isMarketingBuild = process.env.BUILD_TARGET === 'marketing'

// Self-host: the web UI is a static export (out/) that the .NET backend serves next to the API (/api) on one port.
// Vercel / the marketing site keep the normal server build.
const isStaticExport = !process.env.VERCEL && !isMarketingBuild && process.env.NODE_ENV === 'production'

// `pnpm dev` on :3000 proxies /api to the backend so the browser always talks to one origin.
// DEV_BACKEND_URL comes from the environment or the repo-root .env (shared with the backend), default :5000.
const readRootEnv = (name: string): string | undefined => {
  try {
    const text = readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
    const line = text.split(/\r?\n/).find(l => l.trim().startsWith(`${name}=`))
    return line?.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') || undefined
  } catch {
    return undefined
  }
}
const DEV_BACKEND_URL = process.env.DEV_BACKEND_URL || readRootEnv('DEV_BACKEND_URL') || 'http://localhost:5000'

const nextConfig: NextConfig = {
  output: isStaticExport ? 'export' : undefined,
  // Read by src/api/base-url.ts: the exported UI always calls its own origin's /api.
  env: { NEXT_PUBLIC_STATIC_EXPORT: isStaticExport ? 'true' : '' },
  // Export every page as <route>/index.html so the backend can resolve /login, /project/{id}/templates, …
  trailingSlash: isStaticExport,
  images: { unoptimized: isStaticExport },
  reactStrictMode: true,
  ...(isStaticExport
    ? {}
    : {
        async redirects() {
          if (!isMarketingBuild) return []
          return [
            { source: '/login', destination: '/', permanent: false },
            { source: '/create-project', destination: '/', permanent: false },
            { source: '/project/:path*', destination: '/', permanent: false }
          ]
        },
        async rewrites() {
          if (process.env.NODE_ENV !== 'development') return []
          return [{ source: '/api/:path*', destination: `${DEV_BACKEND_URL}/api/:path*` }]
        },
        async headers() {
          return [{ source: '/(.*)', headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }] }]
        }
      }),
  transpilePackages: ['pdfjs-dist'],
  serverExternalPackages: ['canvas'],
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.js'
    }
  },
  webpack: config => {
    config.resolve.alias.canvas = false
    return config
  }
}

export default nextConfig
