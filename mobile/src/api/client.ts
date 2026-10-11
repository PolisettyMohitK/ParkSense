import axios, { AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import type { ApiError } from '../types'

const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost}:8080`
export const VISION_BASE = process.env.EXPO_PUBLIC_VISION_URL ?? `http://${devHost}:8001`

export const TOKEN_KEY = 'parksense.token'
export const USER_KEY = 'parksense.user'
export const BIOMETRIC_KEY = 'parksense.biometric'
export const EXPIRES_KEY = 'parksense.expiresAt'

let token: string | null = null

export function setAuthToken(value: string | null) {
  token = value
}

export function getAuthToken() {
  return token
}

let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

export const client = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000, // free-tier hosts can take ~50s to wake up
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(async (config) => {
  if (!token) {
    token = await SecureStore.getItemAsync(TOKEN_KEY)
  }
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
      // A rejected token must not come back from SecureStore on the next request or launch.
      token = null
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

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
        : `Cannot reach the server at ${API_BASE}. Check your connection.`
    }
    return data?.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Unexpected error'
}
