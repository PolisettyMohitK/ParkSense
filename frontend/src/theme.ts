import { alpha, createTheme, type Theme } from '@mui/material/styles'

export type ColorMode = 'light' | 'dark'
export type AppearancePreference = 'system' | 'light' | 'dark'

const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

/** Parksense brand blue. Single source of truth for accents across web + mobile. */
export const BRAND = {
  50: '#EAF3FF',
  100: '#D3E6FF',
  300: '#7FB4FF',
  500: '#2F7BFF',
  600: '#1F62E0',
  700: '#1749AE',
  light: '#4C93FF',
  dark: '#1F62E0',
} as const

/** Shared semantic colours so status meaning never changes between themes. */
export const STATUS = {
  free: '#34C759',
  occupied: '#FF3B30',
  reserved: '#FF9500',
  offline: '#8E8E93',
  proposed: '#AF52DE',
} as const

export function createAppTheme(mode: ColorMode): Theme {
  const light = mode === 'light'
  const surface = light ? '#FFFFFF' : '#1C1C1E'
  const grouped = light ? '#F2F2F7' : '#000000'
  const text = light ? '#000000' : '#FFFFFF'
  const textSecondary = light ? 'rgba(60,60,67,0.60)' : 'rgba(235,235,245,0.60)'
  const separator = light ? 'rgba(60,60,67,0.18)' : 'rgba(84,84,88,0.55)'
  const primary = light ? BRAND.dark : BRAND.light
  const onPrimary = '#FFFFFF'
  const brandSoft = light ? alpha(BRAND.dark, 0.10) : alpha(BRAND.light, 0.16)
  const ring = light ? alpha(BRAND.dark, 0.28) : alpha(BRAND.light, 0.42)

  return createTheme({
    palette: {
      mode,
      primary: { main: primary, contrastText: onPrimary, light: BRAND[300], dark: BRAND[700] },
      secondary: { main: light ? BRAND.dark : BRAND.light },
      success: { main: light ? STATUS.free : '#30D158' },
      warning: { main: light ? STATUS.reserved : '#FF9F0A' },
      error: { main: light ? STATUS.occupied : '#FF453A' },
      info: { main: primary },
      text: { primary: text, secondary: textSecondary },
      divider: separator,
      background: { default: grouped, paper: surface },
      action: { selected: brandSoft },
    },
    shape: { borderRadius: 14 },
    spacing: 4,
    transitions: {
      duration: {
        shortest: 120,
        shorter: 180,
        short: 220,
        standard: 280,
        complex: 360,
        enteringScreen: 280,
        leavingScreen: 200,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
    typography: {
      fontFamily: SYSTEM_FONT,
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.015em' },
      h4: { fontWeight: 700, letterSpacing: '-0.015em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, color: textSecondary },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.01em' },
      overline: { fontWeight: 700, letterSpacing: '0.06em', fontSize: 11, color: textSecondary },
      body2: { color: textSecondary },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: 'none',
            backgroundColor: grouped,
            color: text,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '*:focus-visible': {
            outline: `2px solid ${primary}`,
            outlineOffset: 2,
          },
          '::selection': { backgroundColor: brandSoft },
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
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: surface,
            backgroundImage: 'none',
            border: light ? `1px solid ${alpha('#000000', 0.06)}` : `1px solid ${alpha('#ffffff', 0.08)}`,
            boxShadow: light ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
            transition: 'box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1), transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: light ? alpha('#FFFFFF', 0.85) : alpha('#000000', 0.8),
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
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
        styleOverrides: {
          root: {
            borderRadius: 12,
            paddingInline: 18,
            minHeight: 40,
            transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 180ms ease',
            '&:active': { transform: 'scale(0.98)' },
          },
          containedPrimary: {
            boxShadow: `0 1px 2px ${alpha(BRAND.dark, 0.24)}`,
            '&:hover': { boxShadow: `0 4px 14px ${alpha(BRAND.dark, 0.28)}` },
          },
          outlined: { borderColor: separator },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { transition: 'background-color 180ms ease' } },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: light ? alpha('#000000', 0.02) : alpha('#ffffff', 0.04),
              transition: 'box-shadow 180ms ease, background-color 180ms ease',
              '&.Mui-focused': { boxShadow: `0 0 0 3px ${ring}` },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: { notchedOutline: { borderColor: separator } },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 9 },
          outlined: { borderColor: separator },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: separator },
          head: { fontWeight: 700, color: textSecondary, whiteSpace: 'nowrap' },
        },
      },
      MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3 } } },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 6, borderRadius: 3, backgroundColor: light ? alpha('#000000', 0.08) : alpha('#ffffff', 0.12) },
          bar: { borderRadius: 3 },
        },
      },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
            backgroundImage: 'none',
            backgroundColor: surface,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            backgroundImage: 'none',
            backgroundColor: surface,
            border: light ? `1px solid ${alpha('#000000', 0.06)}` : `1px solid ${alpha('#ffffff', 0.08)}`,
            boxShadow: light ? '0 8px 30px rgba(0,0,0,0.10)' : '0 8px 30px rgba(0,0,0,0.55)',
          },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: {
            backgroundColor: light ? alpha('#000000', 0.06) : alpha('#ffffff', 0.08),
            borderRadius: 8,
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: separator } } },
    },
  })
}