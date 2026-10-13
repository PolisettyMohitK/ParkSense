import type { CSSProperties } from 'react'
import { useTheme } from '@mui/material'
import { LiveDot } from './Stark'
import { radius } from '../theme'
import { statusKeyFor } from '../theme'
import type { HoloLotBay } from '../three/HoloLotTypes'

/**
 * The bottom HUD sheet that appears when a bay is selected: bay ID in mono,
 * status with a dot (never colour alone), and a one-line hint.
 */
export default function BayReadout({ bay }: { bay: HoloLotBay }) {
  const theme = useTheme()
  const key = statusKeyFor(bay.status)

  return (
    <div style={sheet}>
      <span style={leftGroup}>
        <span style={code}>{bay.code}</span>
        <span style={statusRow}>
          <LiveDot live={key === 'free'} pulse={false} size={6} color={theme.stark.status[key]} />
          <span style={{ color: theme.stark.status[key], textTransform: 'capitalize' }}>
            {theme.stark.statusLabel[key]}
          </span>
        </span>
      </span>
      <span style={hint}>
        {bay.status === 'AVAILABLE' ? 'Select to reserve' : 'Not available'}
      </span>
    </div>
  )
}

const sheet: CSSProperties = {
  position: 'absolute',
  left: 24,
  right: 24,
  bottom: 20,
  zIndex: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  padding: '12px 16px',
  borderRadius: radius.control,
  backgroundColor: 'var(--color-surface-glass)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid var(--color-hairline-strong)',
}

const leftGroup: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 14,
}

const code: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: 'var(--color-text-primary)',
}

const statusRow: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
}

const hint: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-tertiary)',
}
