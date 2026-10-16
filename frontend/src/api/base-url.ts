/**
 * API base URL. The backend serves the web UI and the API on one origin, with the API under /api — so the
 * default (and, in the self-host static export, the only value) is the relative "/api".
 * NEXT_PUBLIC_SERVICE overrides it for the marketing site on Vercel or a split setup; a value without the
 * /api suffix (the v1 style, e.g. http://localhost:5000) gets it appended.
 */
const resolveApiBase = (): string => {
  const configured = (process.env.NEXT_PUBLIC_SERVICE || '').replace(/\/+$/, '')
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' || !configured) return '/api'
  return configured.endsWith('/api') ? configured : `${configured}/api`
}

export const API_BASE_URL = resolveApiBase()

/** Absolute API URL for copy-paste examples (cURL, SDK snippets). */
export const absoluteApiUrl = (): string => {
  if (/^https?:\/\//.test(API_BASE_URL)) return API_BASE_URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'
  return `${origin}${API_BASE_URL}`
}
