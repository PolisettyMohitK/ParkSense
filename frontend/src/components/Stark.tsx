import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Box, Typography, useTheme, type SxProps, type Theme } from '@mui/material'
import { glass, radius, timing } from '../theme'
import { useReducedMotion, useTickUp } from './StarkHooks'
import { cutCornerTokens } from '../theme/tokens.generated'

/* -------------------------------------------------------------------------- *
 * Motion preference
 * -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- *
 * Corner ticks
 * -------------------------------------------------------------------------- */

const TICK = cutCornerTokens.tickSize

/**
 * Four L-shaped hairline ticks instead of a full border. Reserved for the
 * active HUD panel so the frame reads as an instrument bezel, not a card.
 */
export function CornerTicks({
  color,
  size = TICK,
  sx,
}: {
  color?: string
  size?: number
  sx?: CSSProperties
}) {
  const theme = useTheme()
  const stroke = color ?? theme.stark.holo
  const corner: CSSProperties = { position: 'absolute', width: size, height: size, pointerEvents: 'none' }
  const corners: CSSProperties[] = [
    { top: 0, left: 0, borderTop: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    { top: 0, right: 0, borderTop: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
    { bottom: 0, left: 0, borderBottom: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    { bottom: 0, right: 0, borderBottom: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
  ]
  const extra = (sx ?? {}) as CSSProperties
  return (
    <>
      {corners.map((style, index) => (
        <div key={index} style={{ ...corner, ...style, ...extra }} />
      ))}
    </>
  )
}

/* -------------------------------------------------------------------------- *
 * Live dot
 * -------------------------------------------------------------------------- */

/** 6 px holo dot with a slow pulse. Reserved for genuinely real-time things. */
export function LiveDot({
  live = true,
  size = 6,
  color,
  pulse = true,
  sx,
}: {
  live?: boolean
  size?: number
  color?: string
  pulse?: boolean
  sx?: CSSProperties
}) {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const dot = color ?? (live ? theme.stark.holo : theme.palette.text.secondary)
  const animate = live && pulse && !reduced
  const style: CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: '50%',
    background: dot,
    boxShadow: live ? `0 0 0 3px ${theme.stark.holoSoft}` : undefined,
    animation: animate ? `starkPulse ${timing.duration.pulse}ms ease-in-out infinite` : undefined,
    ...(sx as CSSProperties),
  }
  return <span aria-hidden style={style} />
}

/** Live dot + label, used in the rail footer and the HUD. */
export function LiveBadge({ live, label }: { live: boolean; label?: string }) {
  const theme = useTheme()
  const text = label ?? (live ? 'Live' : 'Offline')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: theme.palette.text.secondary }}>
      <LiveDot live={live} />
      <span
        style={{
          fontFamily: theme.stark.mono,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        {text}
      </span>
    </span>
  )
}

/* -------------------------------------------------------------------------- *
 * Numeric tick-up
 * -------------------------------------------------------------------------- */

function formatWith(value: number, decimals: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Instrument readout: monospace, tabular figures, optional tick-up on change.
 * Used for every count, price, percentage and duration in the product.
 */
export function NumericReadout({
  value,
  decimals = 0,
  prefix,
  suffix,
  duration = 300,
  size = 28,
  weight = 600,
  color,
  align = 'left',
  as = 'span',
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  size?: number
  weight?: number
  color?: string
  align?: 'left' | 'center' | 'right'
  as?: 'span' | 'div' | 'p'
}) {
  const theme = useTheme()
  const display = useTickUp(value, duration)
  return (
    <Box
      component={as}
      data-numeric="true"
      sx={{
        fontFamily: theme.stark.mono,
        fontSize: size,
        lineHeight: 1.1,
        fontWeight: weight,
        color: color ?? theme.palette.text.primary,
        textAlign: align,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {prefix}
      {formatWith(display, decimals)}
      {suffix}
    </Box>
  )
}

/* -------------------------------------------------------------------------- *
 * Glass panel
 * -------------------------------------------------------------------------- */

export function GlassPanel({
  children,
  elevation = true,
  ticks = false,
  className,
  style,
}: {
  children: ReactNode
  elevation?: boolean
  ticks?: boolean
  className?: string
  style?: CSSProperties
}) {
  const theme = useTheme()
  const surfaces = glass(theme)
  const base: CSSProperties = {
    position: 'relative',
    ...(elevation ? surfaces : { backgroundColor: theme.stark.surfaceRaised }),
    border: `1px solid ${theme.stark.hairline}`,
    borderRadius: radius.panel,
    boxShadow: theme.stark.shadowLight,
    ...style,
  }
  return (
    <div className={className} style={base}>
      {ticks ? <CornerTicks color={theme.stark.holo} /> : null}
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 * Section label
 * -------------------------------------------------------------------------- */

/** Overline section label. Separates regions without drawing a box. */
export function SectionLabel({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  const theme = useTheme()
  return (
    <Typography
      variant="overline"
      component="div"
      sx={{
        color: theme.palette.text.secondary,
        letterSpacing: '0.12em',
        mb: 1,
        ...(sx as object),
      }}
    >
      {children}
    </Typography>
  )
}

/* -------------------------------------------------------------------------- *
 * Wireframe mark — tiny illustration in the same visual language as HoloLot
 * -------------------------------------------------------------------------- */

/**
 * A miniature wireframe lot drawn from the same primitives as the 3D scene:
 * an isometric slab, contour ticks and three bays. Static SVG, ~1 KB, used for
 * empty states and as the HoloLot placeholder at the right aspect ratio.
 */
export function WireframeMark({ size = 96, color }: { size?: number; color?: string }) {
  const theme = useTheme()
  const stroke = color ?? theme.stark.holo
  const soft = theme.stark.hairlineStrong
  return (
    <svg
      width={size}
      height={size * 0.68}
      viewBox="0 0 140 96"
      fill="none"
      aria-hidden
      focusable="false"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path d="M18 60 L70 30 L122 60 L70 90 Z" stroke={soft} strokeWidth="1" />
      <path d="M18 60 L70 30 L122 60" stroke={stroke} strokeWidth="1.2" strokeOpacity="0.55" />
      <path d="M33 54 L56 41 L56 55 L33 68 Z" stroke={stroke} strokeWidth="1.1" />
      <path d="M84 78 L107 65 L107 79 L84 92 Z" stroke={stroke} strokeWidth="1.1" />
      <path d="M33 54 L56 41 M33 68 L56 55 M84 78 L107 65 M84 92 L107 79" stroke={stroke} strokeWidth="1.1" />
      <path d="M56 66 L79 53 L79 67 L56 80 Z" stroke={stroke} strokeWidth="1.1" strokeOpacity="0.4" strokeDasharray="3 3" />
      <path d="M18 60 L70 90 L122 60" stroke={soft} strokeWidth="1" strokeDasharray="2 4" />
      <circle cx="70" cy="24" r="2" fill={stroke} fillOpacity="0.7" />
    </svg>
  )
}

/* -------------------------------------------------------------------------- *
 * Scanline sweep
 * -------------------------------------------------------------------------- */

/**
 * One faint horizontal gradient pass. Fired once when live occupancy data lands;
 * `trigger` must change for it to replay.
 */
export function ScanSweep({ trigger, reduced }: { trigger: number; reduced?: boolean }) {
  const theme = useTheme()
  const [key, setKey] = useState(0)
  const last = useRef(trigger)

  useEffect(() => {
    if (trigger !== last.current) {
      last.current = trigger
      setKey((k) => k + 1)
    }
  }, [trigger])

  if (reduced) return null
  return (
    <div
      key={key}
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        borderRadius: 'inherit',
        zIndex: 2,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '38%',
          background: `linear-gradient(180deg, transparent, ${theme.stark.holoSoft}, transparent)`,
          animation: `starkScan ${timing.duration.sweep}ms ${timing.easing.out} 1`,
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 * useKeyboardRoving — arrow-key navigation for the parallel bay list
 * -------------------------------------------------------------------------- */
