import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          }
        ]
      }
    ]
  },
  transpilePackages: ['react-pdf', 'pdfjs-dist'],
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
