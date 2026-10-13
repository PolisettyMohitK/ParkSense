const fs = require('fs')
const path = require('path')

const tokensPath = path.join(__dirname, 'tokens.json')
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))

/* ------------------------------------------------------------------ *
 * Colour maths. Handles #rgb, #rrggbb, rgb(), rgba().
 * ------------------------------------------------------------------ */

function parseColor(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()

  if (text.startsWith('#')) {
    const raw = text.slice(1)
    if (raw.length === 3 || raw.length === 4) {
      return [0, 1, 2].map((i) => parseInt(raw[i] + raw[i], 16))
    }
    if (raw.length === 6 || raw.length === 8) {
      return [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16))
    }
    return null
  }

  const match = text.match(/^rgba?\(([^)]+)\)$/i)
  if (match) {
    const parts = match[1].split(/[,/\s]+/).filter(Boolean)
    if (parts.length < 3) return null
    return parts.slice(0, 3).map((p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p)))
  }
  return null
}

/** Flatten a possibly translucent colour onto an opaque backdrop. */
function composite(fg, bg) {
  const match = fg.match(/^rgba?\(([^)]+)\)$/i)
  if (!match) return fg
  const parts = match[1].split(/[,/\s]+/).filter(Boolean)
  if (parts.length < 4) return fg
  const alpha = parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])
  if (alpha >= 1) return fg
  const rgb = parseColor(fg)
  if (!rgb || !bg) return fg
  const blended = rgb.map((c, i) => c * alpha + bg[i] * (1 - alpha))
  return `rgb(${blended.map((c) => Math.round(c)).join(', ')})`
}

function relativeLuminance(color) {
  const rgb = parseColor(color)
  if (!rgb) return null
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  if (l1 === null || l2 === null) return null
  const bright = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (bright + 0.05) / (dark + 0.05)
}

/* ------------------------------------------------------------------ *
 * 1. Contrast validation
 * ------------------------------------------------------------------ */

const MODES = ['light', 'dark']
const BODY_PAIRS = ['textPrimary', 'textSecondary', 'textTertiary', 'holo', 'arc']
const UI_PAIRS = [
  'statusFree',
  'statusOccupied',
  'statusReserved',
  'statusOffline',
  'statusProposed',
  'controlBorder',
]
const BACKDROPS = ['canvas', 'surface', 'surfaceRaised']

const failures = []
const rows = []

console.log('--- WCAG contrast validation (Stark Minimal) ---')

for (const mode of MODES) {
  const palette = tokens.color[mode]
  for (const backdrop of BACKDROPS) {
    const bg = composite(palette[backdrop], composite(palette.surface, '#FFFFFF'))
    for (const key of BODY_PAIRS) {
      const ratio = contrastRatio(palette[key], bg)
      if (ratio === null) {
        failures.push(`${mode}.${key} is not a parseable colour`)
        continue
      }
      rows.push({ mode, pair: `${key} on ${backdrop}`, ratio, min: 4.5 })
      if (ratio < 4.5) failures.push(`${mode}: ${key} on ${backdrop} is ${ratio.toFixed(2)}:1 (needs 4.5:1)`)
    }
    for (const key of UI_PAIRS) {
      const ratio = contrastRatio(palette[key], bg)
      if (ratio === null) {
        failures.push(`${mode}.${key} is not a parseable colour`)
        continue
      }
      rows.push({ mode, pair: `${key} on ${backdrop}`, ratio, min: 3 })
      if (ratio < 3) failures.push(`${mode}: ${key} on ${backdrop} is ${ratio.toFixed(2)}:1 (needs 3:1)`)
    }
    // Primary button label must clear 4.5:1 against its own fill.
    const onPrimary = contrastRatio(palette.onPrimary, palette.primary)
    if (onPrimary !== null && onPrimary < 4.5) {
      failures.push(`${mode}: onPrimary on primary is ${onPrimary.toFixed(2)}:1 (needs 4.5:1)`)
    }
  }
}

const worst = {}
for (const row of rows) {
  if (!worst[row.mode] || row.ratio < worst[row.mode].ratio) worst[row.mode] = row
}
for (const mode of MODES) {
  const w = worst[mode]
  console.log(`  ${mode.padEnd(5)} worst pair: ${w.pair} → ${w.ratio.toFixed(2)}:1 (min ${w.min}:1)`)
}

if (failures.length > 0) {
  console.error('\n✗ WCAG AA contrast validation failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  throw new Error('WCAG AA contrast validation failed. Fix design-tokens/tokens.json.')
}
console.log('✓ All contrast pairs meet WCAG AA\n')

/* ------------------------------------------------------------------ *
 * 2. Token emitters
 * ------------------------------------------------------------------ */

/** Re-emit the colour maps with the legacy keys that predate Stark Minimal. */
function expandColors(mode) {
  const c = tokens.color[mode]
  return {
    ...c,
    // Back-compat aliases for components that still speak the v2 vocabulary.
    separator: c.hairline,
    separatorStrong: c.hairlineStrong,
    ring: c.holoGlow,
    silver: c.hairlineStrong,
    silverSubtle: c.actionHover,
  }
}

const expanded = { light: expandColors('light'), dark: expandColors('dark') }

function serialize(value) {
  return JSON.stringify(value, null, 2)
}

function emitModule(themeTypeName) {
  return `/**
 * AUTO-GENERATED from design-tokens/tokens.json. DO NOT EDIT DIRECTLY.
 * Run 'npm run tokens' (from frontend/) to re-generate.
 */

export const lightColors = ${serialize(expanded.light)}

export const darkColors = ${serialize(expanded.dark)}

export const spacingTokens = ${serialize(tokens.spacing)}

export const radiusTokens = ${serialize(tokens.radius)}

export const typographyTokens = ${serialize(tokens.typography)}

export const motionTokens = ${serialize(tokens.motion)}

export const elevationTokens = ${serialize(tokens.elevation)}

export const cutCornerTokens = ${serialize(tokens.cutCorner)}

export const sceneTokens = ${serialize(tokens.scene)}

export const designTokens = {
  version: ${serialize(tokens.version)},
  name: ${serialize(tokens.name)},
  color: { light: lightColors, dark: darkColors },
  spacing: spacingTokens,
  radius: radiusTokens,
  typography: typographyTokens,
  motion: motionTokens,
  elevation: elevationTokens,
  cutCorner: cutCornerTokens,
  scene: sceneTokens,
} as const

export type ${themeTypeName} = typeof lightColors
`
}

const webOut = path.join(__dirname, '../frontend/src/theme/tokens.generated.ts')
fs.writeFileSync(webOut, emitModule('WebThemeColors'), 'utf8')
console.log(`✓ Generated ${webOut}`)

const mobileOut = path.join(__dirname, '../mobile/src/theme/tokens.generated.ts')
fs.writeFileSync(mobileOut, emitModule('MobileThemeColors'), 'utf8')
console.log(`✓ Generated ${mobileOut}`)

/* ------------------------------------------------------------------ *
 * 3. CSS custom properties
 * ------------------------------------------------------------------ */

function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function colorVars(palette) {
  let out = ''
  for (const [k, v] of Object.entries(palette)) {
    out += `  --color-${toKebabCase(k)}: ${v};\n`
  }
  return out
}

const cssContent = `/**
 * AUTO-GENERATED from design-tokens/tokens.json. DO NOT EDIT DIRECTLY.
 * Run 'npm run tokens' (from frontend/) to re-generate.
 */

:root {
  color-scheme: light;
${colorVars(expanded.light)}${'  '}
  --spacing-xs: ${tokens.spacing.xs}px;
  --spacing-sm: ${tokens.spacing.sm}px;
  --spacing-md: ${tokens.spacing.md}px;
  --spacing-lg: ${tokens.spacing.lg}px;
  --spacing-xl: ${tokens.spacing.xl}px;
  --spacing-xxl: ${tokens.spacing.xxl}px;
  --spacing-xxxl: ${tokens.spacing.xxxl}px;

  --radius-chip: ${tokens.radius.chip}px;
  --radius-control: ${tokens.radius.control}px;
  --radius-panel: ${tokens.radius.panel}px;
  --radius-pill: ${tokens.radius.pill}px;
  --radius-chamfer: ${tokens.radius.chamfer}px;

  --cut-corner: ${tokens.cutCorner.clipPath};
  --cut-corner-size: ${tokens.cutCorner.tickSize}px;

  --font-family: ${tokens.typography.fontFamily};
  --font-mono: ${tokens.typography.fontFamilyMono};

  --ease-out: ${tokens.motion.easing.out};
  --ease-standard: ${tokens.motion.easing.standard};
  --duration-fast: ${tokens.motion.duration.fast}ms;
  --duration-base: ${tokens.motion.duration.base}ms;
  --duration-slow: ${tokens.motion.duration.slow}ms;
  --duration-tick: ${tokens.motion.duration.tick}ms;

  --elevation-light: ${tokens.elevation.shadowLight};
  --elevation-light-strong: ${tokens.elevation.shadowLightStrong};
}

[data-theme='dark'] {
  color-scheme: dark;
${colorVars(expanded.dark)}}

[data-theme='dark'] {
  --elevation-light: none;
  --elevation-light-strong: none;
  --elevation-inner: ${tokens.elevation.innerDark};
}

[data-theme='light'] {
  --elevation-inner: none;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* One typographic rule for the whole app: instrument readouts are tabular. */
.num,
[data-numeric='true'] {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

:focus-visible {
  outline: 2px solid var(--color-holo);
  outline-offset: 2px;
}

::selection {
  background: var(--color-holo-soft);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

/* Auth shell: split layout on desktop, dimmed scene band on mobile. */
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.auth-scene {
  position: relative;
  height: 22vh;
  min-height: 150px;
  overflow: hidden;
  opacity: 0.55;
}

.auth-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 40%, var(--color-canvas) 100%);
}

.auth-form {
  display: grid;
  place-items: center;
  padding: clamp(24px, 4vw, 56px);
}

.auth-form-inner {
  width: 100%;
  max-width: 400px;
}

.auth-hero {
  margin-bottom: 28px;
}

@media (min-width: 900px) {
  .auth-shell {
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  }

  .auth-scene {
    height: 100vh;
    opacity: 1;
  }

  .auth-scene::after {
    background: linear-gradient(90deg, transparent 55%, var(--color-canvas) 100%);
  }

  .auth-hero {
    display: block;
  }
}

@media (max-width: 899px) {
  .auth-hero {
    display: none;
  }
}

/* Skeleton shimmer — one faint holo pass, left to right. */
@keyframes starkShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Live connection dot. */
@keyframes starkPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.82); }
}

/* A single scanline pass across the HoloLot when live data lands. */
@keyframes starkScan {
  0% { transform: translateY(-6%); opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { transform: translateY(106%); opacity: 0; }
}

@keyframes starkFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes starkChevron {
  0% { background-position: 0 0; }
  100% { background-position: 28px 0; }
}
`

const cssOut = path.join(__dirname, '../frontend/src/index.css')
fs.writeFileSync(cssOut, cssContent, 'utf8')
console.log(`✓ Generated ${cssOut}`)

console.log('\n✓ Design tokens generated across web and mobile.')
