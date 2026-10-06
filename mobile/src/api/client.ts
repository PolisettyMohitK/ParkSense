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
  timeout: 20000,
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
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
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
    return data?.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Unexpected error'
}
