import type { CSSProperties } from 'react'
import { Button, useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import StatusChip from './StatusChip'
import { LiveDot } from './Stark'
import { radius } from '../theme'
import type { ParkingSpace } from '../types'

/**
 * Operator mode: the same bottom HUD sheet as a driver sees, plus the three
 * per-bay context actions staff already have via the API.
 */
export default function OperatorBaySheet({
  space,
  canManage,
  busy,
  onMarkOccupied,
  onMarkVacant,
  onOutOfService,
  onClose,
}: {
  space: ParkingSpace
  canManage: boolean
  busy: boolean
  onMarkOccupied: () => void
  onMarkVacant: () => void
  onOutOfService: () => void | Promise<void>
  onClose: () => void
}) {
  const theme = useTheme()
  const occupied = space.status === 'OCCUPIED'

  return (
    <section aria-label={`Bay ${space.code ?? space.id}`} style={sheet(theme)}>
      <div style={identity}>
        <span style={code}>{space.code ?? `#${space.id}`}</span>
        <span style={chips}>
          <StatusChip kind="space" value={space.status} />
          {space.verificationStatus !== 'VERIFIED' ? (
            <StatusChip kind="verification" value={space.verificationStatus} />
          ) : null}
        </span>
        {space.label ? <span style={label(theme)}>{space.label}</span> : null}
      </div>

      {canManage ? (
        <div style={actions}>
          <Button size="small" disabled={busy || occupied} onClick={onMarkOccupied}>
            Mark occupied
          </Button>
          <Button size="small" disabled={busy || !occupied} onClick={onMarkVacant}>
            Mark vacant
          </Button>
          <Button
            size="small"
            disabled={busy || space.operationalState === 'OUT_OF_SERVICE'}
            onClick={onOutOfService}
            sx={{ color: theme.stark.status.occupied }}
          >
            Out of service
          </Button>
          <span style={{ flex: 1 }} />
          <span style={occupancyHint(theme)}>
            <LiveDot live={false} pulse={false} size={5} color={theme.palette.text.tertiary} />
            {space.operationalState.replace(/_/g, ' ').toLowerCase()}
          </span>
        </div>
      ) : (
        <span style={occupancyHint(theme)}>Read-only access</span>
      )}

      <Button size="small" onClick={onClose} aria-label="Close bay panel">
        Close
      </Button>
    </section>
  )
}

const sheet = (theme: Theme): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  flexWrap: 'wrap',
  marginTop: 20,
  padding: '16px 20px',
  borderRadius: radius.panel,
  border: `1px solid ${theme.stark.hairlineStrong}`,
  backgroundColor: theme.stark.surface,
  boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : theme.stark.shadowLight,
})

const identity: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }

const code: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: 'var(--color-text-primary)',
}

const chips: CSSProperties = { display: 'inline-flex', gap: 6, alignItems: 'center' }

const label = (theme: Theme): CSSProperties => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
})

const actions: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }

const occupancyHint = (theme: Theme): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: theme.palette.text.tertiary,
  textTransform: 'capitalize',
})
