import { Api } from './apiGenerated'
import { API_BASE_URL } from '@/api/base-url'
import { AxiosError, AxiosRequestConfig } from 'axios'

const api = new Api({
  baseURL: API_BASE_URL,
  withCredentials: true
})

// Setup request interceptor - No longer need to attach token manually
// api.instance.interceptors.request.use(...)

// Setup response interceptor
api.instance.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    // In cloud mode the frontend has no backend — never redirect to maintenance
    if (process.env.NEXT_PUBLIC_SITE_MODE === 'cloud') {
      return Promise.reject(error)
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Handle 401 Unauthorized for silent refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/google-login') &&
      !originalRequest.url?.includes('/auth/github/exchange') &&
      !originalRequest.url?.includes('/auth/gitlab-login')
    ) {
      originalRequest._retry = true

      try {
        // Call the refresh token endpoint.
        // The backend should read the refreshToken from the httpOnly cookie
        // and set a new accessToken in the cookie upon success.
        await api.auth.refreshTokenCreate()

        // Retry the original request
        return api.instance(originalRequest)
      } catch (refreshError) {
        // If refresh fails, check if server is alive
        try {
          const { checkServerHealth } = await import('@/api/health')
          await checkServerHealth()

          // Session expired (server is up but token is invalid) — clear auth and send to login
          if (typeof globalThis.window !== 'undefined') {
            const { default: Cookies } = await import('js-cookie')
            Cookies.remove('is_authenticated')
            localStorage.removeItem('currentProjectId')

            if (!globalThis.window.location.pathname.startsWith('/login')) {
              globalThis.window.location.href = '/login'
            }
          }
        } catch (healthError) {
          // If health check fails, assume server is down or unreachable
          if (typeof globalThis.window !== 'undefined') {
            const redirectUrl = encodeURIComponent(globalThis.window.location.href)
            globalThis.window.location.href = `/close-server?redirectUrl=${redirectUrl}`
          }
        }

        return Promise.reject(refreshError)
      }
    }
    // Handle Network Errors (Server likely down)
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      // Prevent infinite loops: If the failed request IS the health check, reject immediately
      // so checkServerHealth can catch it and try the fallback.
      if (originalRequest.url?.includes('/health')) {
        return Promise.reject(error)
      }

      try {
        const { checkServerHealth } = await import('@/api/health')
        await checkServerHealth()
      } catch (healthError) {
        // If health check fails, server is unreachable -> Redirect to maintenance
        if (typeof globalThis.window !== 'undefined') {
          // Avoid infinite redirect loop if already on close-server
          if (!globalThis.window.location.pathname.includes('/close-server')) {
            const redirectUrl = encodeURIComponent(globalThis.window.location.href)
            globalThis.window.location.href = `/close-server?redirectUrl=${redirectUrl}`
          }
        }
      }
    }

    return Promise.reject(error?.response || error)
  }
)

export { api }
