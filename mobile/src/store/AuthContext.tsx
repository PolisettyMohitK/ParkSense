import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { authApi } from '../api/endpoints'
import { BIOMETRIC_KEY, TOKEN_KEY, USER_KEY, onUnauthorized, setAuthToken } from '../api/client'
import type { User } from '../types'

interface AuthContextValue {
  ready: boolean
  token: string | null
  user: User | null
  locked: boolean
  biometricEnabled: boolean
  biometricAvailable: boolean
  login: (email: string, password: string) => Promise<void>
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
      const [storedToken, storedUser, biometric, hardware] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(BIOMETRIC_KEY),
        LocalAuthentication.hasHardwareAsync(),
      ])
      if (!active) return

      setBiometricAvailable(hardware)
      setBiometricEnabled(biometric === 'true')
      if (storedToken) {
        setAuthToken(storedToken)
        setToken(storedToken)
        setUser(storedUser ? (JSON.parse(storedUser) as User) : null)
        if (biometric === 'true' && hardware) {
          setLocked(true)
        }
      }
      setReady(true)
    }

    bootstrap()
    onUnauthorized(() => {
      setToken(null)
      setUser(null)
    })
    return () => {
      active = false
    }
  }, [])

  const persist = useCallback(async (nextToken: string, nextUser: User) => {
    setAuthToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser))
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password)
      await persist(response.token, response.user)
      setLocked(false)
    },
    [persist],
  )

  const logout = useCallback(async () => {
    setAuthToken(null)
    setToken(null)
    setUser(null)
    setLocked(false)
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
  }, [])

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
      logout,
      unlock,
      setBiometric,
      refreshUser,
    }),
    [ready, token, user, locked, biometricEnabled, biometricAvailable, login, logout, unlock, setBiometric, refreshUser],
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
