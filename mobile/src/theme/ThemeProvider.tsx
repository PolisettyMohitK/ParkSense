import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { StyleSheet, useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { darkColors, lightColors, type Palette } from './palette'

export type AppearancePreference = 'system' | 'light' | 'dark'

const APPEARANCE_KEY = 'parksense.appearance'

interface ThemeContextValue {
  colors: Palette
  scheme: 'light' | 'dark'
  preference: AppearancePreference
  setPreference: (preference: AppearancePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme()
  const [preference, setPreferenceState] = useState<AppearancePreference>('system')

  useEffect(() => {
    SecureStore.getItemAsync(APPEARANCE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored)
      }
    })
  }, [])

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next)
    SecureStore.setItemAsync(APPEARANCE_KEY, next).catch(() => undefined)
  }, [])

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference
  const colors = scheme === 'dark' ? darkColors : lightColors

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, scheme, preference, setPreference }),
    [colors, scheme, preference, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return context
}

/**
 * Build a styles hook that recomputes whenever the palette changes.
 * The factory receives the current palette; callers usually wrap the result in
 * `StyleSheet.create` themselves.
 */
export function makeStyles<T>(factory: (colors: Palette) => T) {
  return function useStyles(): T {
    const { colors } = useTheme()
    return useMemo(() => factory(colors), [colors])
  }
}
