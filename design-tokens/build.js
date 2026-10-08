const fs = require('fs')
const path = require('path')

const tokensPath = path.join(__dirname, 'tokens.json')
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))

function parseRgb(hex) {
  if (hex.startsWith('#')) {
    const raw = hex.slice(1)
    if (raw.length === 3) {
      return [
        parseInt(raw[0] + raw[0], 16),
        parseInt(raw[1] + raw[1], 16),
        parseInt(raw[2] + raw[2], 16),
      ]
    }
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ]
  }
  return [0, 0, 0]
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(fgHex, bgHex) {
  const l1 = relativeLuminance(parseRgb(fgHex))
  const l2 = relativeLuminance(parseRgb(bgHex))
  const bright = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (bright + 0.05) / (dark + 0.05)
}

// 1. Contrast Check Validation
console.log('--- Verifying WCAG Contrast Ratios ---')

const lightTextRatio = contrastRatio(tokens.color.light.textPrimary, tokens.color.light.surface)
const lightSecondaryRatio = contrastRatio(tokens.color.light.textSecondary, tokens.color.light.surface)
const lightFreeRatio = contrastRatio(tokens.color.light.statusFree, tokens.color.light.surface)

console.log(`Light Text Primary: ${lightTextRatio.toFixed(2)}:1 (Min 4.5:1)`)
console.log(`Light Text Secondary: ${lightSecondaryRatio.toFixed(2)}:1 (Min 4.5:1)`)
console.log(`Light Free Status: ${lightFreeRatio.toFixed(2)}:1 (Min 4.5:1)`)

if (lightTextRatio < 4.5 || lightSecondaryRatio < 4.5 || lightFreeRatio < 4.5) {
  throw new Error('WCAG AA contrast validation failed for light theme!')
}

const darkTextRatio = contrastRatio(tokens.color.dark.textPrimary, tokens.color.dark.surface)
const darkSecondaryRatio = contrastRatio(tokens.color.dark.textSecondary, tokens.color.dark.surface)
const darkFreeRatio = contrastRatio(tokens.color.dark.statusFree, tokens.color.dark.surface)

console.log(`Dark Text Primary: ${darkTextRatio.toFixed(2)}:1 (Min 4.5:1)`)
console.log(`Dark Text Secondary: ${darkSecondaryRatio.toFixed(2)}:1 (Min 4.5:1)`)
console.log(`Dark Free Status: ${darkFreeRatio.toFixed(2)}:1 (Min 4.5:1)`)

if (darkTextRatio < 4.5 || darkSecondaryRatio < 4.5 || darkFreeRatio < 4.5) {
  throw new Error('WCAG AA contrast validation failed for dark theme!')
}

console.log('✓ All contrast ratios meet WCAG AA standards!\n')

// 2. Generate frontend/src/theme/tokens.generated.ts
const frontendTokens = `/**
 * AUTO-GENERATED from design-tokens/tokens.json. DO NOT EDIT DIRECTLY.
 * Run 'npm run tokens' to re-generate.
 */

export const designTokens = ${JSON.stringify(tokens, null, 2)} as const

export const lightTokens = designTokens.color.light
export const darkTokens = designTokens.color.dark
export const spacingTokens = designTokens.spacing
export const radiusTokens = designTokens.radius
export const typographyTokens = designTokens.typography

export type ThemeColors = typeof lightTokens
`

const frontendOutputPath = path.join(__dirname, '../frontend/src/theme/tokens.generated.ts')
fs.writeFileSync(frontendOutputPath, frontendTokens, 'utf8')
console.log(`✓ Generated ${frontendOutputPath}`)

// 3. Generate mobile/src/theme/tokens.generated.ts
const mobileTokens = `/**
 * AUTO-GENERATED from design-tokens/tokens.json. DO NOT EDIT DIRECTLY.
 * Run 'npm run tokens' to re-generate.
 */

export const designTokens = ${JSON.stringify(tokens, null, 2)} as const

export const lightTokens = designTokens.color.light
export const darkTokens = designTokens.color.dark
export const spacingTokens = designTokens.spacing
export const radiusTokens = designTokens.radius
export const typographyTokens = designTokens.typography

export type MobileThemeColors = typeof lightTokens
`

const mobileOutputPath = path.join(__dirname, '../mobile/src/theme/tokens.generated.ts')
fs.writeFileSync(mobileOutputPath, mobileTokens, 'utf8')
console.log(`✓ Generated ${mobileOutputPath}`)

// 4. Generate frontend/src/index.css
function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

let cssContent = `/**
 * AUTO-GENERATED from design-tokens/tokens.json. DO NOT EDIT DIRECTLY.
 * Run 'npm run tokens' to re-generate.
 */

:root {
`

for (const [k, v] of Object.entries(tokens.color.light)) {
  cssContent += `  --color-${toKebabCase(k)}: ${v};\n`
}
for (const [k, v] of Object.entries(tokens.spacing)) {
  cssContent += `  --spacing-${k}: ${v}px;\n`
}
for (const [k, v] of Object.entries(tokens.radius)) {
  cssContent += `  --radius-${k}: ${v}px;\n`
}
cssContent += `  --font-family: ${tokens.typography.fontFamily};\n`
cssContent += `}\n\n[data-theme="dark"] {\n`

for (const [k, v] of Object.entries(tokens.color.dark)) {
  cssContent += `  --color-${toKebabCase(k)}: ${v};\n`
}
cssContent += `}\n\n`
cssContent += `* {\n  box-sizing: border-box;\n}\n\n`
cssContent += `html, body {\n  margin: 0;\n  padding: 0;\n  font-family: var(--font-family);\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n`

const cssOutputPath = path.join(__dirname, '../frontend/src/index.css')
fs.writeFileSync(cssOutputPath, cssContent, 'utf8')
console.log(`✓ Generated ${cssOutputPath}`)

console.log('\nDesign tokens successfully generated across web and mobile!')
