import { darkColors, lightColors, motionTokens, radiusTokens, sceneTokens, spacingTokens, typographyTokens } from './tokens.generated'

/**
 * Stark Minimal palette.
 *
 * Holographic cyan is an *accent*: it appears on live states, focus, the active
 * tab and data highlights — never on large fills or body text. Primary is ink.
 */
export interface Palette {
  background: string
  groupedBackground: string
  surface: string
  surfaceRaised: string
  surfaceSunken: string
  glass: string
  glassBlur: number
  fill: string
  text: string
  textSecondary: string
  textTertiary: string
  hairline: string
  hairlineStrong: string
  controlBorder: string
  primary: string
  onPrimary: string
  primaryHover: string
  actionHover: string
  actionSelected: string
  holo: string
  holoSoft: string
  holoGlow: string
  arc: string
  arcSoft: string
  success: string
  danger: string
  warning: string
  info: string
  neutral: string
  overlay: string
  scrim: string
  successDim: string
  dangerDim: string
  warningDim: string
  infoDim: string
  neutralDim: string
  primaryDim: string
  arcDim: string
  /** 8 px 45-degree chamfer for HUD panels. */
  cutCorner: string
  elevationInner: string | null
  elevationShadow: string | null
  mono: string
  /** True in the "Blueprint" light variant. */
  light: boolean
}

const CUT_CORNER = 'polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)'

export const lightPalette: Palette = {
  background: lightColors.canvas,
  groupedBackground: lightColors.canvas,
  surface: lightColors.surface,
  surfaceRaised: lightColors.surfaceRaised,
  surfaceSunken: lightColors.surfaceSunken,
  glass: lightColors.surfaceGlass,
  glassBlur: 20,
  fill: lightColors.actionHover,
  text: lightColors.textPrimary,
  textSecondary: lightColors.textSecondary,
  textTertiary: lightColors.textTertiary,
  hairline: lightColors.hairline,
  hairlineStrong: lightColors.hairlineStrong,
  controlBorder: lightColors.controlBorder,
  primary: lightColors.primary,
  onPrimary: lightColors.onPrimary,
  primaryHover: lightColors.primaryHover,
  actionHover: lightColors.actionHover,
  actionSelected: lightColors.actionSelected,
  holo: lightColors.holo,
  holoSoft: lightColors.holoSoft,
  holoGlow: lightColors.holoGlow,
  arc: lightColors.arc,
  arcSoft: lightColors.arcSoft,
  success: lightColors.statusFree,
  danger: lightColors.statusOccupied,
  warning: lightColors.statusReserved,
  info: lightColors.statusProposed,
  neutral: lightColors.statusOffline,
  overlay: lightColors.overlay,
  scrim: lightColors.scrim,
  successDim: lightColors.statusFreeDim,
  dangerDim: lightColors.statusOccupiedDim,
  warningDim: lightColors.statusReservedDim,
  infoDim: lightColors.statusProposedDim,
  neutralDim: lightColors.statusOfflineDim,
  primaryDim: lightColors.actionSelected,
  arcDim: lightColors.arcSoft,
  cutCorner: CUT_CORNER,
  elevationInner: null,
  elevationShadow: '0 8px 24px rgba(11, 18, 32, 0.06)',
  mono: typographyTokens.fontFamilyMono,
  light: true,
}

export const darkPalette: Palette = {
  background: darkColors.canvas,
  groupedBackground: darkColors.canvas,
  surface: darkColors.surface,
  surfaceRaised: darkColors.surfaceRaised,
  surfaceSunken: darkColors.surfaceSunken,
  glass: darkColors.surfaceGlass,
  glassBlur: 20,
  fill: darkColors.actionHover,
  text: darkColors.textPrimary,
  textSecondary: darkColors.textSecondary,
  textTertiary: darkColors.textTertiary,
  hairline: darkColors.hairline,
  hairlineStrong: darkColors.hairlineStrong,
  controlBorder: darkColors.controlBorder,
  primary: darkColors.primary,
  onPrimary: darkColors.onPrimary,
  primaryHover: darkColors.primaryHover,
  actionHover: darkColors.actionHover,
  actionSelected: darkColors.actionSelected,
  holo: darkColors.holo,
  holoSoft: darkColors.holoSoft,
  holoGlow: darkColors.holoGlow,
  arc: darkColors.arc,
  arcSoft: darkColors.arcSoft,
  success: darkColors.statusFree,
  danger: darkColors.statusOccupied,
  warning: darkColors.statusReserved,
  info: darkColors.statusProposed,
  neutral: darkColors.statusOffline,
  overlay: darkColors.overlay,
  scrim: darkColors.scrim,
  successDim: darkColors.statusFreeDim,
  dangerDim: darkColors.statusOccupiedDim,
  warningDim: darkColors.statusReservedDim,
  infoDim: darkColors.statusProposedDim,
  neutralDim: darkColors.statusOfflineDim,
  primaryDim: darkColors.actionSelected,
  arcDim: darkColors.arcSoft,
  cutCorner: CUT_CORNER,
  elevationInner: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  elevationShadow: null,
  mono: typographyTokens.fontFamilyMono,
  light: false,
}

export const spacing = {
  xs: spacingTokens.xs,
  sm: spacingTokens.sm,
  md: spacingTokens.md,
  lg: spacingTokens.lg,
  xl: spacingTokens.xl,
  xxl: spacingTokens.xxl,
}

export const radius = {
  chip: radiusTokens.chip,
  control: radiusTokens.control,
  panel: radiusTokens.panel,
  pill: radiusTokens.pill,
}

export const scene = sceneTokens
export const timing = motionTokens

/** Semantic status keys. The mapping never changes: free green, occupied red… */
export type StatusKey = 'free' | 'occupied' | 'reserved' | 'offline' | 'proposed'

/** Non-colour redundancy so status is never carried by hue alone. */
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

export function statusColor(colors: Palette, key: StatusKey): string {
  return {
    free: colors.success,
    occupied: colors.danger,
    reserved: colors.warning,
    offline: colors.neutral,
    proposed: colors.info,
  }[key]
}

export function statusDim(colors: Palette, key: StatusKey): string {
  return {
    free: colors.successDim,
    occupied: colors.dangerDim,
    reserved: colors.warningDim,
    offline: colors.neutralDim,
    proposed: colors.infoDim,
  }[key]
}

export interface BadgePalette {
  bg: string
  fg: string
  label: string
  key: StatusKey | null
}

export function statusMaps(colors: Palette) {
  const space: Record<string, BadgePalette> = {
    AVAILABLE: { bg: colors.successDim, fg: colors.success, label: 'Free', key: 'free' },
    OCCUPIED: { bg: colors.dangerDim, fg: colors.danger, label: 'Occupied', key: 'occupied' },
    RESERVED: { bg: colors.warningDim, fg: colors.warning, label: 'Reserved', key: 'reserved' },
    OUT_OF_SERVICE: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Out of service', key: 'offline' },
  }
  const verification: Record<string, BadgePalette> = {
    PROPOSED: { bg: colors.infoDim, fg: colors.info, label: 'Proposed', key: 'proposed' },
    VERIFIED: { bg: colors.successDim, fg: colors.success, label: 'Verified', key: 'free' },
    REJECTED: { bg: colors.dangerDim, fg: colors.danger, label: 'Rejected', key: 'occupied' },
  }
  const reservation: Record<string, BadgePalette> = {
    PENDING: { bg: colors.infoDim, fg: colors.info, label: 'Pending', key: 'proposed' },
    CONFIRMED: { bg: colors.primaryDim, fg: colors.text, label: 'Confirmed', key: null },
    ACTIVE: { bg: colors.successDim, fg: colors.success, label: 'Active', key: 'free' },
    COMPLETED: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Completed', key: 'offline' },
    CANCELLED: { bg: colors.dangerDim, fg: colors.danger, label: 'Cancelled', key: 'occupied' },
    EXPIRED: { bg: colors.warningDim, fg: colors.warning, label: 'Expired', key: 'reserved' },
  }
  const device: Record<string, BadgePalette> = {
    ONLINE: { bg: colors.successDim, fg: colors.success, label: 'Online', key: 'free' },
    OFFLINE: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Offline', key: 'offline' },
    MAINTENANCE: { bg: colors.warningDim, fg: colors.warning, label: 'Maintenance', key: 'reserved' },
  }
  const payment: Record<string, BadgePalette> = {
    NOT_REQUIRED: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Complimentary', key: 'offline' },
    PENDING: { bg: colors.warningDim, fg: colors.warning, label: 'Payment due', key: 'reserved' },
    PAID: { bg: colors.successDim, fg: colors.success, label: 'Paid', key: 'free' },
  }
  const pricing: Record<string, BadgePalette> = {
    FREE: { bg: colors.successDim, fg: colors.success, label: 'Free parking', key: 'free' },
    PAID: { bg: colors.neutralDim, fg: colors.text, label: 'Paid parking', key: null },
  }
  const role: Record<string, BadgePalette> = {
    ADMIN: { bg: colors.primaryDim, fg: colors.text, label: 'Admin', key: null },
    MANAGER: { bg: colors.infoDim, fg: colors.info, label: 'Manager', key: 'proposed' },
    USER: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Driver', key: 'offline' },
  }
  const session: Record<string, BadgePalette> = {
    ACTIVE: { bg: colors.successDim, fg: colors.success, label: 'Parked now', key: 'free' },
    COMPLETED: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Completed', key: 'offline' },
  }
  return { space, verification, reservation, device, payment, pricing, role, session }
}

export type BadgeKind = keyof ReturnType<typeof statusMaps>

export const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '600' as const, letterSpacing: -0.8 },
  title: { fontSize: 28, lineHeight: 32, fontWeight: '600' as const, letterSpacing: -0.4 },
  headline: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '600' as const, letterSpacing: 1.3 },
  mono: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  /** Kept for callers that still read the old names. */
  largeTitle: { fontSize: 28, lineHeight: 32, fontWeight: '600' as const },
  subhead: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  footnote: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
}

export function availabilityTone(colors: Palette, available: number, total: number) {
  if (total === 0 || available === 0) return colors.danger
  if (available / total <= 0.15) return colors.warning
  return colors.success
}
