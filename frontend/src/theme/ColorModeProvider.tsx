import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material'
import { createAppTheme, type AppearancePreference, type ColorMode } from '../theme'

const STORAGE_KEY = 'parksense.appearance'

interface ColorModeContextValue {
  mode: ColorMode
  preference: AppearancePreference
  setPreference: (preference: AppearancePreference) => void
  toggle: () => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [preference, setPreferenceState] = useState<AppearancePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  })

  const setPreference = (next: AppearancePreference) => {
    setPreferenceState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const mode: ColorMode = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference
  const theme = useMemo(() => createAppTheme(mode), [mode])

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      preference,
      setPreference,
      toggle: () => setPreference(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, preference],
  )

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (!context) {
    throw new Error('useColorMode must be used inside ColorModeProvider')
  }
  return context
}
