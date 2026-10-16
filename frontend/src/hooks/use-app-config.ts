'use client'

import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/api/base-url'

/** Per-install settings served by the backend (GET /api/app-config) — the web UI is one static build for everyone. */
export interface AppConfig {
  googleClientId: string | null
  githubClientId: string | null
}

// Build-time values still work for `pnpm dev` and the marketing build.
const FALLBACK: AppConfig = {
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null,
  githubClientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || null
}

let cached: AppConfig | null = null
let pending: Promise<AppConfig> | null = null

const loadAppConfig = (): Promise<AppConfig> => {
  if (cached) return Promise.resolve(cached)
  pending ??= fetch(`${API_BASE_URL}/app-config`, { credentials: 'include' })
    .then((res): Promise<Partial<AppConfig>> => (res.ok ? res.json() : Promise.resolve({})))
    .catch((): Partial<AppConfig> => ({}))
    .then((data: Partial<AppConfig>) => {
      cached = {
        googleClientId: data.googleClientId || FALLBACK.googleClientId,
        githubClientId: data.githubClientId || FALLBACK.githubClientId
      }
      return cached
    })
  return pending
}

export const useAppConfig = (): AppConfig => {
  const [config, setConfig] = useState<AppConfig>(cached ?? FALLBACK)
  useEffect(() => {
    let alive = true
    loadAppConfig().then(c => alive && setConfig(c))
    return () => {
      alive = false
    }
  }, [])
  return config
}
