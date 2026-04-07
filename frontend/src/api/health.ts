import { api } from '@/api/generated/main-service'

/**
 * Checks if the server is healthy/reachable.
 * First tries a standard Axios GET request to /health.
 * If that fails (e.g. Network Error, potential CORS), falls back to a fetch request with mode: 'no-cors'.
 *
 * @returns Promise<void> - Resolves if server is reachable, Rejects if server is down.
 */
export const checkServerHealth = async (): Promise<void> => {
  try {
    await api.instance.get('/health')
  } catch (axiosError) {
    try {
      const baseURL = api.instance.defaults.baseURL || process.env.NEXT_PUBLIC_SERVICE || ''
      const healthUrl = baseURL.endsWith('/') ? `${baseURL}health` : `${baseURL}/health`

      await fetch(healthUrl)
    } catch (fetchError) {
      console.error('Fallback health check failed:', fetchError)
      throw new Error('Server unreachable')
    }
  }
}
