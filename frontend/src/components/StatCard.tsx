import type { CSSProperties, ReactNode } from 'react'
import { useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { radius } from '../theme'
import { motion as framer } from 'framer-motion'
import { NumericReadout } from './Stark'
import { useReducedMotion } from './StarkHooks'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  accent?: string
  hint?: string
  /** Normalised 0..1 series rendered as a sparkline under the readout. */
  spark?: number[]
  decimals?: number
  suffix?: string
}

/**
 * One KPI readout: overline label, monospace instrument number, optional
 * sparkline. Hairline top edge instead of a card — four of these sit in a row
 * on the staff dashboard without shouting.
 */
export default function StatCard({
  label,
  value,
  icon,
  accent,
  hint,
  spark,
  decimals = 0,
  suffix,
}: StatCardProps) {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value))
  const isNumeric = Number.isFinite(numeric)
  const tint = accent ?? theme.stark.holo

  return (
    <framer.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ height: '100%' }}
    >
      <StatBody label={label} numeric={isNumeric ? numeric : 0} decimals={decimals} suffix={suffix} icon={icon} accent={tint} hint={hint} spark={spark} />
    </framer.div>
  )
}

function StatBody({
  label,
  numeric,
  decimals,
  suffix,
  icon,
  accent,
  hint,
  spark,
}: {
  label: string
  numeric: number
  decimals: number
  suffix?: string
  icon?: ReactNode
  accent: string
  hint?: string
  spark?: number[]
}) {
  const theme = useTheme()
  return (
    <div style={body(theme)}>
      <div style={headRow}>
        <span style={labelStyle}>{label}</span>
        {icon ? (
          <span style={{ color: accent, display: 'grid', placeItems: 'center', fontSize: 18, lineHeight: 0 }}>
            {icon}
          </span>
        ) : null}
      </div>
      <NumericReadout value={numeric} decimals={decimals} suffix={suffix} size={30} />
      {spark && spark.length > 1 ? <Sparkline values={spark} color={accent} /> : null}
      {hint ? <span style={hintStyle}>{hint}</span> : null}
    </div>
  )
}

const body = (theme: Theme): CSSProperties => ({
  height: '100%',
  padding: '16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  overflow: 'hidden',
  border: `1px solid ${theme.stark.hairline}`,
  borderRadius: radius.panel,
  backgroundColor: theme.stark.surface,
  boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : theme.stark.shadowLight,
})

const headRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.27,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-tertiary)',
}

/** 1px sparkline. No axes, no labels — just the shape of the trend. */
export function Sparkline({ values, color, height = 22 }: { values: number[]; color?: string; height?: number }) {
  const theme = useTheme()
  const stroke = color ?? theme.stark.holo
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = 100 / (values.length - 1)
  const path = values
    .map((value, index) => {
      const x = index * step
      const y = height - ((value - min) / span) * (height - 3) - 1.5
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const area = `${path} L100,${height} L0,${height} Z`
  const id = `spark-${values.join('_').slice(0, 24)}`

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: 'block', width: '100%', height }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
