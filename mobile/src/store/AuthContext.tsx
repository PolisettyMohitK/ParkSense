import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { authApi } from '../api/endpoints'
import { queryClient } from '../api/queryClient'
import { BIOMETRIC_KEY, EXPIRES_KEY, TOKEN_KEY, USER_KEY, onUnauthorized, setAuthToken } from '../api/client'
import { disconnectSocket } from '../hooks/useOccupancyStream'
import type { User } from '../types'

interface AuthContextValue {
  ready: boolean
  token: string | null
  user: User | null
  locked: boolean
  biometricEnabled: boolean
  biometricAvailable: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: { fullName: string; email: string; password: string; phone?: string }) => Promise<void>
  logout: () => Promise<void>
  unlock: () => Promise<boolean>
  setBiometric: (enabled: boolean) => Promise<boolean>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [locked, setLocked] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      const [storedToken, storedUser, storedExpiry, biometric, hardware] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(EXPIRES_KEY),
        SecureStore.getItemAsync(BIOMETRIC_KEY),
        LocalAuthentication.hasHardwareAsync(),
      ])
      if (!active) return

      setBiometricAvailable(hardware)
      setBiometricEnabled(biometric === 'true')
      const expired = storedExpiry !== null && Number(storedExpiry) <= Date.now()
      if (storedToken && storedUser && !expired) {
        setAuthToken(storedToken)
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as User)
        if (biometric === 'true' && hardware) {
          setLocked(true)
        }
        // Pick up role or profile changes made since the last launch.
        authApi
          .me()
          .then(async (fresh) => {
            if (!active) return
            setUser(fresh)
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh))
          })
          .catch(() => undefined)
      } else if (storedToken) {
        await clearStoredSession()
      }
      setReady(true)
    }

    bootstrap()
    return () => {
      active = false
    }
  }, [])

  const persist = useCallback(async (nextToken: string, nextUser: User, expiresInMs?: number) => {
    setAuthToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser))
    if (expiresInMs) {
      await SecureStore.setItemAsync(EXPIRES_KEY, String(Date.now() + expiresInMs))
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email.trim(), password)
      await persist(response.token, response.user, response.expiresInMs)
      setLocked(false)
    },
    [persist],
  )

  const register = useCallback(
    async (payload: { fullName: string; email: string; password: string; phone?: string }) => {
      const response = await authApi.register(payload)
      await persist(response.token, response.user, response.expiresInMs)
      setLocked(false)
    },
    [persist],
  )

  const logout = useCallback(async () => {
    disconnectSocket()
    queryClient.clear()
    setAuthToken(null)
    setToken(null)
    setUser(null)
    setLocked(false)
    await clearStoredSession()
  }, [])

  // Any 401 (expired or revoked token) signs out completely.
  useEffect(() => {
    onUnauthorized(() => {
      void logout()
    })
  }, [logout])

  // Re-lock with biometrics when the app returns from the background.
  const backgroundedAt = useRef<number | null>(null)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now()
      } else if (state === 'active' && backgroundedAt.current !== null) {
        const away = Date.now() - backgroundedAt.current
        backgroundedAt.current = null
        if (token && biometricEnabled && biometricAvailable && away > 30_000) {
          setLocked(true)
        }
      }
    })
    return () => subscription.remove()
  }, [token, biometricEnabled, biometricAvailable])

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock ParkSense',
      fallbackLabel: 'Use passcode',
    })
    if (result.success) {
      setLocked(false)
      return true
    }
    return false
  }, [])

  const setBiometric = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      if (!enrolled) return false
    }
    await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false')
    setBiometricEnabled(enabled)
    return true
  }, [])

  const refreshUser = useCallback(async () => {
    const fresh = await authApi.me()
    setUser(fresh)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user,
      locked,
      biometricEnabled,
      biometricAvailable,
      login,
      register,
      logout,
      unlock,
      setBiometric,
      refreshUser,
    }),
    [ready, token, user, locked, biometricEnabled, biometricAvailable, login, register, logout, unlock, setBiometric, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

async function clearStoredSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(EXPIRES_KEY),
  ])
}
