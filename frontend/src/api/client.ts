import axios, { AxiosError } from 'axios'
import type { ApiError } from '../types'

export const TOKEN_KEY = 'parksense.token'
export const USER_KEY = 'parksense.user'
export const EXPIRES_KEY = 'parksense.expiresAt'

/** REST base. In dev Vite proxies `/api`; in production this is the absolute API URL. */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Origin that serves the API, websocket and bundled venue photos. Empty when the API is same-origin
 * (dev proxy / nginx), otherwise e.g. `https://parksense-api.onrender.com`.
 */
export const API_ORIGIN: string = /^https?:\/\//.test(API_BASE_URL) ? new URL(API_BASE_URL).origin : ''

/**
 * Resolve an image path from the API. Bundled venue photos (`/places/...`) ship with the web app
 * too, so they load from the CDN even while the API is cold; anything else comes from the API origin.
 */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.startsWith('/places/') ? normalized : `${API_ORIGIN}${normalized}`
}

export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // free-tier hosts can take ~50s to wake up
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const url = error.config?.url ?? ''
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/me/password')
    if (error.response?.status === 401 && !isAuthCall) {
      clearStoredSession()
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'expired' } }))
    }
    return Promise.reject(error)
  },
)

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(EXPIRES_KEY)
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    if (data?.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
      return Object.entries(data.fieldErrors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ')
    }
    if (!error.response) {
      return error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. It may be waking up - please try again.'
        : 'Cannot reach the server. Check your connection and try again.'
    }
    return data?.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Unexpected error'
}

/** Status code of a failed request, if any. */
export function apiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
