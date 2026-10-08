/**
 * AUTO-GENERATED from design-tokens/tokens.json. DO NOT EDIT DIRECTLY.
 * Run 'npm run tokens' to re-generate.
 */

export const designTokens = {
  "$schema": "https://json.schemastore.org/design-tokens",
  "name": "ParkSense Apple Monochrome Design System",
  "version": "2.0.0",
  "color": {
    "light": {
      "canvas": "#F2F2F4",
      "surface": "#FFFFFF",
      "surfaceRaised": "#FFFFFF",
      "surfaceElevated": "#FFFFFF",
      "textPrimary": "#0A0A0A",
      "textSecondary": "#5C5C60",
      "textTertiary": "#8A8A8E",
      "silver": "#B4B4B8",
      "silverSubtle": "#E5E5EA",
      "separator": "#D9D9DD",
      "primary": "#0A0A0A",
      "onPrimary": "#FAFAFA",
      "actionHover": "rgba(10, 10, 10, 0.04)",
      "actionSelected": "rgba(10, 10, 10, 0.08)",
      "ring": "rgba(10, 10, 10, 0.24)",
      "statusFree": "#1A7F37",
      "statusOccupied": "#D70015",
      "statusReserved": "#B25E00",
      "statusOffline": "#6E6E73",
      "statusProposed": "#8944AB",
      "statusFreeDim": "rgba(26, 127, 55, 0.12)",
      "statusOccupiedDim": "rgba(215, 0, 21, 0.12)",
      "statusReservedDim": "rgba(178, 94, 0, 0.12)",
      "statusOfflineDim": "rgba(110, 110, 115, 0.12)",
      "statusProposedDim": "rgba(137, 68, 171, 0.12)"
    },
    "dark": {
      "canvas": "#0A0A0A",
      "surface": "#161618",
      "surfaceRaised": "#1C1C1E",
      "surfaceElevated": "#242426",
      "textPrimary": "#FAFAFA",
      "textSecondary": "#A8A8AD",
      "textTertiary": "#6E6E73",
      "silver": "#3A3A3C",
      "silverSubtle": "#2C2C2E",
      "separator": "#28282C",
      "primary": "#FAFAFA",
      "onPrimary": "#0A0A0A",
      "actionHover": "rgba(250, 250, 250, 0.06)",
      "actionSelected": "rgba(250, 250, 250, 0.12)",
      "ring": "rgba(250, 250, 250, 0.36)",
      "statusFree": "#34C759",
      "statusOccupied": "#FF453A",
      "statusReserved": "#FF9F0A",
      "statusOffline": "#8E8E93",
      "statusProposed": "#BF5AF2",
      "statusFreeDim": "rgba(52, 199, 89, 0.18)",
      "statusOccupiedDim": "rgba(255, 69, 58, 0.18)",
      "statusReservedDim": "rgba(255, 159, 10, 0.18)",
      "statusOfflineDim": "rgba(142, 142, 147, 0.18)",
      "statusProposedDim": "rgba(191, 90, 242, 0.18)"
    }
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24,
    "xxl": 32,
    "xxxl": 48
  },
  "radius": {
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 20,
    "card": 16,
    "modal": 20,
    "pill": 9999
  },
  "typography": {
    "fontFamily": "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"SF Pro Display\", \"SF Pro\", \"Inter\", -apple-system, sans-serif",
    "weights": {
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  }
} as const

export const lightTokens = designTokens.color.light
export const darkTokens = designTokens.color.dark
export const spacingTokens = designTokens.spacing
export const radiusTokens = designTokens.radius
export const typographyTokens = designTokens.typography

export type MobileThemeColors = typeof lightTokens
