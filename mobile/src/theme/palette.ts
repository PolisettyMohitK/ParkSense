/**
 * Apple-style design tokens.
 * Light: white backgrounds, black text. Dark: black backgrounds, white text.
 * Colours follow the iOS system palette so the app feels native on both platforms.
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
  neutralDim: string
  primaryDim: string
}

export const lightColors: Palette = {
  background: '#FFFFFF',
  groupedBackground: '#F2F2F7',
  surface: '#FFFFFF',
  fill: 'rgba(120,120,128,0.12)',
  text: '#000000',
  textSecondary: 'rgba(60,60,67,0.60)',
  separator: 'rgba(60,60,67,0.18)',
  primary: '#000000',
  onPrimary: '#FFFFFF',
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
  overlay: 'rgba(0,0,0,0.35)',
  successDim: 'rgba(52,199,89,0.14)',
  dangerDim: 'rgba(255,59,48,0.14)',
  warningDim: 'rgba(255,149,0,0.16)',
  neutralDim: 'rgba(120,120,128,0.14)',
  primaryDim: 'rgba(120,120,128,0.16)',
}

export const darkColors: Palette = {
  background: '#000000',
  groupedBackground: '#000000',
  surface: '#1C1C1E',
  fill: 'rgba(118,118,128,0.24)',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.60)',
  separator: 'rgba(84,84,88,0.55)',
  primary: '#FFFFFF',
  onPrimary: '#000000',
  success: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
  info: '#0A84FF',
  overlay: 'rgba(0,0,0,0.6)',
  successDim: 'rgba(48,209,88,0.20)',
  dangerDim: 'rgba(255,69,58,0.22)',
  warningDim: 'rgba(255,159,10,0.22)',
  neutralDim: 'rgba(118,118,128,0.28)',
  primaryDim: 'rgba(118,118,128,0.30)',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  card: 16,
  pill: 999,
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
    PROPOSED: { bg: colors.warningDim, fg: colors.warning, label: 'Proposed' },
    VERIFIED: { bg: colors.successDim, fg: colors.success, label: 'Verified' },
    REJECTED: { bg: colors.dangerDim, fg: colors.danger, label: 'Rejected' },
  }
  const reservation: Record<string, BadgePalette> = {
    PENDING: { bg: colors.neutralDim, fg: colors.info, label: 'Pending' },
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
