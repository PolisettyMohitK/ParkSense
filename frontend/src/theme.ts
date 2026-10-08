import { alpha, createTheme, type Theme } from '@mui/material/styles'
import {
  lightTokens,
  darkTokens,
  spacingTokens,
  radiusTokens,
  typographyTokens,
} from './theme/tokens.generated'

export type ColorMode = 'light' | 'dark'
export type AppearancePreference = 'system' | 'light' | 'dark'

const SYSTEM_FONT = typographyTokens.fontFamily

/** Shared status tokens for canvas, charts, and SVG rendering */
export const STATUS = {
  light: {
    free: lightTokens.statusFree,
    occupied: lightTokens.statusOccupied,
    reserved: lightTokens.statusReserved,
    offline: lightTokens.statusOffline,
    proposed: lightTokens.statusProposed,
  },
  dark: {
    free: darkTokens.statusFree,
    occupied: darkTokens.statusOccupied,
    reserved: darkTokens.statusReserved,
    offline: darkTokens.statusOffline,
    proposed: darkTokens.statusProposed,
  },
} as const

export function createAppTheme(mode: ColorMode): Theme {
  const light = mode === 'light'
  const tokens = light ? lightTokens : darkTokens

  return createTheme({
    palette: {
      mode,
      primary: {
        main: tokens.primary,
        contrastText: tokens.onPrimary,
        light: light ? '#2C2C2E' : '#FFFFFF',
        dark: light ? '#000000' : '#D1D1D6',
      },
      secondary: {
        main: tokens.silver,
        contrastText: tokens.textPrimary,
      },
      success: {
        main: tokens.statusFree,
        light: tokens.statusFreeDim,
      },
      warning: {
        main: tokens.statusReserved,
        light: tokens.statusReservedDim,
      },
      error: {
        main: tokens.statusOccupied,
        light: tokens.statusOccupiedDim,
      },
      info: {
        main: tokens.statusProposed,
        light: tokens.statusProposedDim,
      },
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary,
      },
      divider: tokens.separator,
      background: {
        default: tokens.canvas,
        paper: tokens.surface,
      },
      action: {
        hover: tokens.actionHover,
        selected: tokens.actionSelected,
      },
    },
    shape: { borderRadius: radiusTokens.card },
    spacing: spacingTokens.xs,
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
      h1: { fontWeight: 700, letterSpacing: '-0.025em' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.018em' },
      h4: { fontWeight: 700, letterSpacing: '-0.015em' },
      h5: { fontWeight: 600, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.005em' },
      subtitle2: { fontWeight: 600, color: tokens.textSecondary },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.01em' },
      overline: { fontWeight: 700, letterSpacing: '0.06em', fontSize: 11, color: tokens.textSecondary },
      body2: { color: tokens.textSecondary },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: 'none',
            backgroundColor: tokens.canvas,
            color: tokens.textPrimary,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '*:focus-visible': {
            outline: `2px solid ${tokens.primary}`,
            outlineOffset: 2,
          },
          '::selection': { backgroundColor: tokens.silverSubtle },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${tokens.separator}`,
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: tokens.surface,
            backgroundImage: 'none',
            border: `1px solid ${tokens.separator}`,
            boxShadow: light ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
            transition: 'border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: alpha(tokens.surface, 0.82),
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            borderBottom: `1px solid ${tokens.separator}`,
            color: tokens.textPrimary,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.surface,
            backgroundImage: 'none',
            borderRight: `1px solid ${tokens.separator}`,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.md,
            paddingInline: 18,
            minHeight: 40,
            transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 180ms ease',
            '&:active': { transform: 'scale(0.98)' },
          },
          containedPrimary: {
            backgroundColor: tokens.primary,
            color: tokens.onPrimary,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: light ? '#242426' : '#E5E5EA',
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: tokens.separator,
            color: tokens.textPrimary,
            '&:hover': {
              borderColor: tokens.silver,
              backgroundColor: tokens.actionHover,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: tokens.textPrimary,
            transition: 'background-color 180ms ease',
            '&:hover': { backgroundColor: tokens.actionHover },
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: radiusTokens.md,
              backgroundColor: light ? '#FFFFFF' : tokens.silverSubtle,
              transition: 'box-shadow 180ms ease, border-color 180ms ease',
              '&.Mui-focused': { boxShadow: `0 0 0 3px ${tokens.ring}` },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: { borderColor: tokens.separator },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: radiusTokens.sm,
          },
          outlined: { borderColor: tokens.separator },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: tokens.separator },
          head: { fontWeight: 700, color: tokens.textSecondary, whiteSpace: 'nowrap' },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 2, borderRadius: 2, backgroundColor: tokens.primary },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 6,
            borderRadius: 3,
            backgroundColor: light ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.10)',
          },
          bar: { borderRadius: 3 },
        },
      },
      MuiTooltip: { defaultProps: { arrow: true } },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: radiusTokens.modal,
            backgroundImage: 'none',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.separator}`,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: radiusTokens.card,
            backgroundImage: 'none',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.separator}`,
            boxShadow: light ? '0 10px 30px rgba(0,0,0,0.08)' : '0 10px 30px rgba(0,0,0,0.60)',
          },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: {
            backgroundColor: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
            borderRadius: radiusTokens.sm,
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: tokens.separator } } },
    },
  })
}