import { alpha, createTheme, type Theme } from '@mui/material/styles'

export type ColorMode = 'light' | 'dark'
export type AppearancePreference = 'system' | 'light' | 'dark'

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export function createAppTheme(mode: ColorMode): Theme {
  const light = mode === 'light'
  const surface = light ? '#FFFFFF' : '#1C1C1E'
  const grouped = light ? '#F2F2F7' : '#000000'
  const text = light ? '#000000' : '#FFFFFF'
  const textSecondary = light ? 'rgba(60,60,67,0.60)' : 'rgba(235,235,245,0.60)'
  const separator = light ? 'rgba(60,60,67,0.18)' : 'rgba(84,84,88,0.55)'
  const primary = light ? '#000000' : '#FFFFFF'
  const onPrimary = light ? '#FFFFFF' : '#000000'

  return createTheme({
    palette: {
      mode,
      background: { default: grouped, paper: surface },
      primary: { main: primary, contrastText: onPrimary },
      secondary: { main: light ? '#007AFF' : '#0A84FF' },
      success: { main: light ? '#34C759' : '#30D158' },
      warning: { main: light ? '#FF9500' : '#FF9F0A' },
      error: { main: light ? '#FF3B30' : '#FF453A' },
      info: { main: light ? '#007AFF' : '#0A84FF' },
      text: { primary: text, secondary: textSecondary },
      divider: separator,
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: SYSTEM_FONT,
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: 'none',
            backgroundColor: grouped,
            color: text,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: light ? 'none' : `1px solid ${alpha('#ffffff', 0.08)}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: surface,
            backgroundImage: 'none',
            border: light ? `1px solid ${alpha('#000000', 0.06)}` : `1px solid ${alpha('#ffffff', 0.08)}`,
            boxShadow: light ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: light ? alpha('#FFFFFF', 0.85) : alpha('#000000', 0.8),
            backdropFilter: 'blur(14px)',
            borderBottom: `1px solid ${separator}`,
            color: text,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: light ? '#FFFFFF' : '#0A0A0A',
            backgroundImage: 'none',
            borderRight: `1px solid ${separator}`,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 12, paddingInline: 18 } },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    },
  })
}
