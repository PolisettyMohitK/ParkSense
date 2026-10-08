import { lightTokens, darkTokens, spacingTokens, radiusTokens } from './tokens.generated'

/**
 * Apple-style monochrome design tokens with polished silver.
 * Strictly single-sourced from design-tokens/tokens.json.
 */

export interface Palette {
  background: string
  groupedBackground: string
  surface: string
  fill: string
  text: string
  textSecondary: string
  separator: string
  primary: string
  onPrimary: string
  success: string
  danger: string
  warning: string
  info: string
  overlay: string
  successDim: string
  dangerDim: string
  warningDim: string
  infoDim: string
  neutralDim: string
  primaryDim: string
}

export const lightColors: Palette = {
  background: lightTokens.surface,
  groupedBackground: lightTokens.canvas,
  surface: lightTokens.surface,
  fill: lightTokens.actionSelected,
  text: lightTokens.textPrimary,
  textSecondary: lightTokens.textSecondary,
  separator: lightTokens.separator,
  primary: lightTokens.primary,
  onPrimary: lightTokens.onPrimary,
  success: lightTokens.statusFree,
  danger: lightTokens.statusOccupied,
  warning: lightTokens.statusReserved,
  info: lightTokens.statusProposed,
  overlay: 'rgba(0,0,0,0.40)',
  successDim: lightTokens.statusFreeDim,
  dangerDim: lightTokens.statusOccupiedDim,
  warningDim: lightTokens.statusReservedDim,
  infoDim: lightTokens.statusProposedDim,
  neutralDim: lightTokens.statusOfflineDim,
  primaryDim: 'rgba(10,10,10,0.08)',
}

export const darkColors: Palette = {
  background: darkTokens.canvas,
  groupedBackground: darkTokens.canvas,
  surface: darkTokens.surface,
  fill: darkTokens.actionSelected,
  text: darkTokens.textPrimary,
  textSecondary: darkTokens.textSecondary,
  separator: darkTokens.separator,
  primary: darkTokens.primary,
  onPrimary: darkTokens.onPrimary,
  success: darkTokens.statusFree,
  danger: darkTokens.statusOccupied,
  warning: darkTokens.statusReserved,
  info: darkTokens.statusProposed,
  overlay: 'rgba(0,0,0,0.70)',
  successDim: darkTokens.statusFreeDim,
  dangerDim: darkTokens.statusOccupiedDim,
  warningDim: darkTokens.statusReservedDim,
  infoDim: darkTokens.statusProposedDim,
  neutralDim: darkTokens.statusOfflineDim,
  primaryDim: 'rgba(250,250,250,0.12)',
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
  sm: radiusTokens.sm,
  md: radiusTokens.md,
  lg: radiusTokens.lg,
  card: radiusTokens.card,
  pill: radiusTokens.pill,
}

export interface BadgePalette {
  bg: string
  fg: string
  label: string
}

export function statusMaps(colors: Palette) {
  const space: Record<string, BadgePalette> = {
    AVAILABLE: { bg: colors.successDim, fg: colors.success, label: 'Available' },
    OCCUPIED: { bg: colors.dangerDim, fg: colors.danger, label: 'Occupied' },
    RESERVED: { bg: colors.warningDim, fg: colors.warning, label: 'Reserved' },
    OUT_OF_SERVICE: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Out of service' },
  }
  const verification: Record<string, BadgePalette> = {
    PROPOSED: { bg: colors.infoDim, fg: colors.info, label: 'Proposed' },
    VERIFIED: { bg: colors.successDim, fg: colors.success, label: 'Verified' },
    REJECTED: { bg: colors.dangerDim, fg: colors.danger, label: 'Rejected' },
  }
  const reservation: Record<string, BadgePalette> = {
    PENDING: { bg: colors.infoDim, fg: colors.info, label: 'Pending' },
    CONFIRMED: { bg: colors.primaryDim, fg: colors.text, label: 'Confirmed' },
    ACTIVE: { bg: colors.successDim, fg: colors.success, label: 'Active' },
    COMPLETED: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Completed' },
    CANCELLED: { bg: colors.dangerDim, fg: colors.danger, label: 'Cancelled' },
    EXPIRED: { bg: colors.warningDim, fg: colors.warning, label: 'Expired' },
  }
  const device: Record<string, BadgePalette> = {
    ONLINE: { bg: colors.successDim, fg: colors.success, label: 'Online' },
    OFFLINE: { bg: colors.neutralDim, fg: colors.textSecondary, label: 'Offline' },
    MAINTENANCE: { bg: colors.warningDim, fg: colors.warning, label: 'Maintenance' },
  }
  return { space, verification, reservation, device }
}

export type BadgeKind = keyof ReturnType<typeof statusMaps>

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '400' as const },
  subhead: { fontSize: 15, fontWeight: '400' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
}

export function availabilityTone(colors: Palette, available: number, total: number) {
  if (total === 0 || available === 0) return colors.danger
  if (available / total <= 0.15) return colors.warning
  return colors.success
}
