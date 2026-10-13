import { createTheme, type Theme } from '@mui/material/styles'
import {
  cutCornerTokens,
  elevationTokens,
  lightColors,
  darkColors,
  motionTokens,
  radiusTokens,
  sceneTokens,
  spacingTokens,
  typographyTokens,
} from './theme/tokens.generated'

export type ColorMode = 'light' | 'dark'
export type AppearancePreference = 'system' | 'light' | 'dark'

/**
 * The monospace stack used for anything that reads like an instrument: bay IDs,
 * plates, receipt refs, timestamps and every numeric readout.
 */
export const MONO = typographyTokens.fontFamilyMono

/**
 * Semantic status palette. The mapping is load-bearing and must never drift:
 * free = green, occupied = red, reserved = amber, offline = grey, proposed = violet.
 */
export const STATUS = {
  light: {
    free: lightColors.statusFree,
    occupied: lightColors.statusOccupied,
    reserved: lightColors.statusReserved,
    offline: lightColors.statusOffline,
    proposed: lightColors.statusProposed,
  },
  dark: {
    free: darkColors.statusFree,
    occupied: darkColors.statusOccupied,
    reserved: darkColors.statusReserved,
    offline: darkColors.statusOffline,
    proposed: darkColors.statusProposed,
  },
} as const

export type StatusKey = keyof typeof STATUS.dark

/** Non-colour redundancy for status, so state is never carried by hue alone. */
export const STATUS_GLYPH: Record<StatusKey, string> = {
  free: '○',
  occupied: '●',
  reserved: '◑',
  offline: '—',
  proposed: '◇',
}

export const STATUS_LABEL: Record<StatusKey, string> = {
  free: 'Free',
  occupied: 'Occupied',
  reserved: 'Reserved',
  offline: 'Out of service',
  proposed: 'Proposed',
}

export function statusKeyFor(status: string | null | undefined): StatusKey {
  switch (status) {
    case 'AVAILABLE':
    case 'VACANT':
      return 'free'
    case 'OCCUPIED':
      return 'occupied'
    case 'RESERVED':
      return 'reserved'
    case 'OUT_OF_SERVICE':
      return 'offline'
    case 'PROPOSED':
      return 'proposed'
    default:
      return 'offline'
  }
}

export function createAppTheme(mode: ColorMode): Theme {
  const light = mode === 'light'
  const c = light ? lightColors : darkColors
  const scale = typographyTokens.scale
  // MUI treats a numeric lineHeight as a multiplier of the font size.
  const lh = (step: { size: number; lineHeight: number }) => step.lineHeight / step.size

  const theme = createTheme({
    palette: {
      mode,
      // Primary is ink, never holo. Holographic cyan is an accent for live
      // states, focus and data highlights — never a large fill.
      primary: { main: c.primary, contrastText: c.onPrimary },
      secondary: { main: c.holo, contrastText: light ? '#FFFFFF' : '#07090C' },
      success: { main: c.statusFree, contrastText: light ? '#FFFFFF' : '#07090C' },
      warning: { main: c.statusReserved, contrastText: light ? '#FFFFFF' : '#07090C' },
      error: { main: c.statusOccupied, contrastText: light ? '#FFFFFF' : '#07090C' },
      info: { main: c.statusProposed, contrastText: light ? '#FFFFFF' : '#07090C' },
      text: { primary: c.textPrimary, secondary: c.textSecondary, disabled: c.textTertiary },
      divider: c.hairline,
      background: { default: c.canvas, paper: c.surface },
      action: { hover: c.actionHover, selected: c.actionSelected, disabled: c.actionHover },
    },
    shape: { borderRadius: radiusTokens.control },
    spacing: spacingTokens.xs,
    transitions: {
      duration: {
        shortest: motionTokens.duration.fast,
        shorter: motionTokens.duration.fast,
        short: motionTokens.duration.base,
        standard: motionTokens.duration.base,
        complex: motionTokens.duration.slow,
        enteringScreen: motionTokens.duration.base,
        leavingScreen: motionTokens.duration.fast,
      },
      easing: {
        easeInOut: motionTokens.easing.standard,
        easeOut: motionTokens.easing.out,
        easeIn: motionTokens.easing.standard,
      },
    },
    typography: {
      fontFamily: typographyTokens.fontFamily,
      h1: { fontSize: scale.display.size, lineHeight: lh(scale.display), fontWeight: scale.display.weight, letterSpacing: scale.display.tracking },
      h2: { fontSize: scale.title.size, lineHeight: lh(scale.title), fontWeight: scale.title.weight, letterSpacing: scale.title.tracking },
      h3: { fontSize: scale.headline.size, lineHeight: lh(scale.headline), fontWeight: scale.headline.weight, letterSpacing: scale.headline.tracking },
      h4: { fontSize: scale.headline.size, lineHeight: lh(scale.headline), fontWeight: scale.headline.weight, letterSpacing: scale.headline.tracking },
      h5: { fontSize: scale.body.size, lineHeight: lh(scale.body), fontWeight: scale.headline.weight, letterSpacing: scale.headline.tracking },
      h6: { fontSize: scale.caption.size, lineHeight: lh(scale.caption), fontWeight: scale.overline.weight, letterSpacing: scale.caption.tracking, textTransform: 'uppercase' },
      subtitle1: { fontSize: scale.body.size, lineHeight: lh(scale.body), fontWeight: scale.headline.weight },
      subtitle2: { fontSize: scale.caption.size, lineHeight: lh(scale.caption), fontWeight: scale.caption.weight, color: c.textSecondary },
      body1: { fontSize: scale.body.size, lineHeight: lh(scale.body) },
      body2: { fontSize: scale.body.size, lineHeight: lh(scale.body), color: c.textSecondary },
      caption: { fontSize: scale.caption.size, lineHeight: scale.caption.lineHeight, color: c.textTertiary, letterSpacing: scale.caption.tracking },
      button: { textTransform: 'none', fontWeight: scale.headline.weight, letterSpacing: scale.caption.tracking },
      overline: {
        fontSize: scale.overline.size,
        lineHeight: scale.overline.lineHeight,
        fontWeight: scale.overline.weight,
        letterSpacing: scale.overline.tracking,
        textTransform: 'uppercase' as const,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: c.canvas,
            color: c.textPrimary,
            backgroundImage: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
          '*:focus-visible': {
            outline: `2px solid ${c.holo}`,
            outlineOffset: '2px',
            borderRadius: radiusTokens.chip,
          },
          '::selection': { backgroundColor: c.holoSoft },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${c.hairline}`,
            borderRadius: radiusTokens.panel,
            boxShadow: light ? elevationTokens.shadowLight : 'none',
            backgroundColor: c.surface,
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: c.surface,
            border: `1px solid ${c.hairline}`,
            borderRadius: radiusTokens.panel,
            boxShadow: light ? elevationTokens.shadowLight : 'none',
            transition: `border-color ${motionTokens.duration.fast}ms ${motionTokens.easing.out}`,
            '&:hover': { borderColor: c.hairlineStrong },
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            color: c.textPrimary,
            backgroundColor: 'transparent',
            transition: `background-color ${motionTokens.duration.base}ms ${motionTokens.easing.out}, border-color ${motionTokens.duration.base}ms ${motionTokens.easing.out}`,
            '&.MuiAppBar-scrolled': {
              backgroundColor: c.surfaceGlass,
              backdropFilter: `blur(${c.surfaceGlassBlur})`,
              WebkitBackdropFilter: `blur(${c.surfaceGlassBlur})`,
              borderBottom: `1px solid ${c.hairline}`,
            },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: light ? c.surface : c.canvas,
            backgroundImage: 'none',
            borderRight: `1px solid ${c.hairline}`,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.control,
            minHeight: 40,
            paddingInline: spacingTokens.lg,
            transition: `background-color ${motionTokens.duration.fast}ms ${motionTokens.easing.out}, border-color ${motionTokens.duration.fast}ms ${motionTokens.easing.out}`,
          },
          containedPrimary: {
            backgroundColor: c.primary,
            color: c.onPrimary,
            '&:hover': { backgroundColor: c.primaryHover, boxShadow: 'none' },
          },
          outlined: {
            borderColor: c.controlBorder,
            color: c.textPrimary,
            '&:hover': { borderColor: c.holo, backgroundColor: c.holoSoft },
          },
          text: { color: c.textSecondary, '&:hover': { backgroundColor: c.actionHover, color: c.textPrimary } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: c.textSecondary,
            borderRadius: radiusTokens.control,
            transition: `background-color ${motionTokens.duration.fast}ms ${motionTokens.easing.out}, color ${motionTokens.duration.fast}ms ${motionTokens.easing.out}`,
            '&:hover': { backgroundColor: c.actionHover, color: c.textPrimary },
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: radiusTokens.control,
              backgroundColor: light ? c.surface : c.surfaceRaised,
              fontSize: scale.body.size,
              transition: `box-shadow ${motionTokens.duration.fast}ms ${motionTokens.easing.out}, border-color ${motionTokens.duration.fast}ms ${motionTokens.easing.out}`,
              '&.Mui-focused': {
                borderColor: c.holo,
                boxShadow: `0 0 0 2px ${c.holoSoft}, 0 0 0 1px ${c.holo}`,
              },
            },
          },
        },
      },
      MuiOutlinedInput: { styleOverrides: { notchedOutline: { borderColor: c.hairlineStrong } } },
      MuiInputLabel: { styleOverrides: { root: { color: c.textSecondary, fontSize: scale.body.size } } },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: scale.caption.weight, borderRadius: radiusTokens.chip, height: 26, fontSize: scale.caption.size },
          outlined: { borderColor: c.hairlineStrong, color: c.textSecondary },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: c.hairline, fontSize: scale.body.size },
          head: {
            fontWeight: scale.overline.weight,
            letterSpacing: scale.overline.tracking,
            textTransform: 'uppercase',
            fontSize: scale.overline.size,
            color: c.textTertiary,
            whiteSpace: 'nowrap',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { height: 2, backgroundColor: c.holo, boxShadow: `0 0 8px ${c.holoGlow}` },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 3, borderRadius: 2, backgroundColor: c.actionSelected },
          bar: { borderRadius: 2 },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: true, enterDelay: 400 },
        styleOverrides: {
          tooltip: {
            backgroundColor: c.surfaceRaised,
            color: c.textPrimary,
            border: `1px solid ${c.hairline}`,
            borderRadius: radiusTokens.chip,
            fontSize: scale.caption.size,
            boxShadow: light ? elevationTokens.shadowLightStrong : 'none',
          },
          arrow: { color: c.surfaceRaised },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: radiusTokens.panel,
            backgroundImage: 'none',
            backgroundColor: c.surface,
            border: `1px solid ${c.hairline}`,
            boxShadow: light ? elevationTokens.shadowLightStrong : 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: radiusTokens.control,
            backgroundImage: 'none',
            backgroundColor: c.surfaceRaised,
            border: `1px solid ${c.hairline}`,
            boxShadow: light ? elevationTokens.shadowLightStrong : 'none',
            minWidth: 200,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { borderRadius: radiusTokens.chip, margin: spacingTokens.xs, minHeight: 36, fontSize: 14 },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' },
        styleOverrides: {
          root: {
            backgroundColor: c.hairline,
            borderRadius: radiusTokens.chip,
            '& .MuiSkeleton-wave::after': {
              backgroundImage: `linear-gradient(90deg, transparent, ${c.holoSoft}, transparent)`,
              animation: 'starkShimmer 1400ms ease-in-out infinite',
            },
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: c.hairline } } },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': { color: c.holo },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: c.holo },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: radiusTokens.control, border: `1px solid ${c.hairline}`, backgroundImage: 'none' },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            backgroundColor: c.surfaceRaised,
            color: c.textPrimary,
            border: `1px solid ${c.hairline}`,
            borderRadius: radiusTokens.control,
            boxShadow: light ? elevationTokens.shadowLightStrong : 'none',
            fontSize: scale.body.size,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.control,
            transition: `background-color ${motionTokens.duration.fast}ms ${motionTokens.easing.out}`,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: c.surfaceRaised,
            color: c.textPrimary,
            border: `1px solid ${c.hairlineStrong}`,
            fontWeight: scale.headline.weight,
          },
        },
      },
    },
  })

  theme.stark = starkTheme(mode)
  return theme
}

declare module '@mui/material/styles' {
  interface Theme {
    stark: {
      holo: string
      holoSoft: string
      holoGlow: string
      arc: string
      arcSoft: string
      hairline: string
      hairlineStrong: string
      glass: string
      glassBlur: string
      controlBorder: string
      surface: string
      surfaceRaised: string
      surfaceSunken: string
      mono: string
      status: typeof STATUS.dark
      statusDim: Record<StatusKey, string>
      statusGlyph: Record<StatusKey, string>
      statusLabel: Record<StatusKey, string>
      cutCorner: string
      innerGlow: string
      shadowLight: string
      shadowLightStrong: string
    }
  }
  interface TypeText {
    /** Stark Minimal adds a third, deliberately quiet text tier. */
    tertiary: string
  }
}

/**
 * Non-colour tokens stay out of `theme.stark` on purpose: they are large deep
 * literal types, and threading them through `Theme` makes every MUI `sx`
 * override blow past TypeScript's instantiation limit. Import them directly.
 */
export { radiusTokens as radius, motionTokens as timing, sceneTokens as scene, cutCornerTokens as cutCornerConfig }

/** Everything the components need that does not fit in the MUI palette. */
export function starkTheme(mode: ColorMode): Theme['stark'] {
  const c = mode === 'light' ? lightColors : darkColors
  return {
    holo: c.holo,
    holoSoft: c.holoSoft,
    holoGlow: c.holoGlow,
    arc: c.arc,
    arcSoft: c.arcSoft,
    hairline: c.hairline,
    hairlineStrong: c.hairlineStrong,
    glass: c.surfaceGlass,
    glassBlur: c.surfaceGlassBlur,
    controlBorder: c.controlBorder,
    surface: c.surface,
    surfaceRaised: c.surfaceRaised,
    surfaceSunken: c.surfaceSunken,
    mono: MONO,
    status: STATUS[mode],
    statusDim: {
      free: c.statusFreeDim,
      occupied: c.statusOccupiedDim,
      reserved: c.statusReservedDim,
      offline: c.statusOfflineDim,
      proposed: c.statusProposedDim,
    },
    statusGlyph: STATUS_GLYPH,
    statusLabel: STATUS_LABEL,
    cutCorner: cutCornerTokens.clipPath,
    innerGlow: mode === 'dark' ? elevationTokens.innerDark : 'none',
    shadowLight: mode === 'dark' ? 'none' : elevationTokens.shadowLight,
    shadowLightStrong: mode === 'dark' ? 'none' : elevationTokens.shadowLightStrong,
  }
}

/** Translucent scrim used behind full-bleed imagery. */
export function scrim(theme: Theme): string {
  return theme.palette.mode === 'dark' ? darkColors.scrim : lightColors.scrim
}

/** Glass surface shorthand. */
export function glass(theme: Theme): {
  backgroundColor: string
  backdropFilter: string
  WebkitBackdropFilter: string
} {
  return {
    backgroundColor: theme.stark.glass,
    backdropFilter: `blur(${theme.stark.glassBlur}) saturate(160%)`,
    WebkitBackdropFilter: `blur(${theme.stark.glassBlur}) saturate(160%)`,
  }
}
