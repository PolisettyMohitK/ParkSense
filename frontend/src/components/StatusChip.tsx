import { Chip, useTheme, type ChipProps } from '@mui/material'
import { STATUS_GLYPH, STATUS_LABEL, radius, statusKeyFor, type StatusKey } from '../theme'

type Color = ChipProps['color']

/**
 * Every status chip is a dim tinted fill with a 1px status-tinted hairline plus
 * a leading glyph, so state is never carried by colour alone.
 */
interface Config {
  label: string
  color: Color
  key?: StatusKey
}

const SPACE_STATUS: Record<string, Config> = {
  AVAILABLE: { label: 'Free', color: 'success', key: 'free' },
  OCCUPIED: { label: 'Occupied', color: 'error', key: 'occupied' },
  RESERVED: { label: 'Reserved', color: 'warning', key: 'reserved' },
  OUT_OF_SERVICE: { label: 'Out of service', color: 'default', key: 'offline' },
}

const VERIFICATION: Record<string, Config> = {
  PROPOSED: { label: 'Proposed', color: 'info', key: 'proposed' },
  VERIFIED: { label: 'Verified', color: 'success', key: 'free' },
  REJECTED: { label: 'Rejected', color: 'error', key: 'occupied' },
}

const RESERVATION: Record<string, Config> = {
  PENDING: { label: 'Pending', color: 'info', key: 'proposed' },
  CONFIRMED: { label: 'Confirmed', color: 'default' },
  ACTIVE: { label: 'Active', color: 'success', key: 'free' },
  COMPLETED: { label: 'Completed', color: 'default', key: 'offline' },
  CANCELLED: { label: 'Cancelled', color: 'error', key: 'occupied' },
  EXPIRED: { label: 'Expired', color: 'warning', key: 'reserved' },
}

const DEVICE: Record<string, Config> = {
  ONLINE: { label: 'Online', color: 'success', key: 'free' },
  OFFLINE: { label: 'Offline', color: 'default', key: 'offline' },
  MAINTENANCE: { label: 'Maintenance', color: 'warning', key: 'reserved' },
}

const PAYMENT: Record<string, Config> = {
  NOT_REQUIRED: { label: 'Complimentary', color: 'default', key: 'offline' },
  PENDING: { label: 'Payment due', color: 'warning', key: 'reserved' },
  PAID: { label: 'Paid', color: 'success', key: 'free' },
}

const SESSION: Record<string, Config> = {
  ACTIVE: { label: 'Parked now', color: 'success', key: 'free' },
  COMPLETED: { label: 'Completed', color: 'default', key: 'offline' },
}

const PRICING: Record<string, Config> = {
  FREE: { label: 'Free parking', color: 'success', key: 'free' },
  PAID: { label: 'Paid parking', color: 'default' },
}

const ROLE: Record<string, Config> = {
  ADMIN: { label: 'Admin', color: 'default' },
  MANAGER: { label: 'Manager', color: 'info', key: 'proposed' },
  USER: { label: 'Driver', color: 'default', key: 'offline' },
}

type Kind = 'space' | 'verification' | 'reservation' | 'device' | 'payment' | 'session' | 'pricing' | 'role'

const MAPS: Record<Kind, Record<string, Config>> = {
  space: SPACE_STATUS,
  verification: VERIFICATION,
  reservation: RESERVATION,
  device: DEVICE,
  payment: PAYMENT,
  session: SESSION,
  pricing: PRICING,
  role: ROLE,
}

interface StatusChipProps {
  kind: Kind
  value: string
  size?: ChipProps['size']
  variant?: ChipProps['variant']
}

export default function StatusChip({ kind, value, size = 'small', variant = 'outlined' }: StatusChipProps) {
  const theme = useTheme()
  const config: Config = MAPS[kind][value] ?? { label: value, color: 'default' }
  const statusKey: StatusKey | undefined = config.key ?? (kind === 'space' ? statusKeyFor(value) : undefined)
  const tint = statusKey ? theme.stark.status[statusKey] : undefined
  const fill = statusKey ? theme.stark.statusDim[statusKey] : undefined

  return (
    <Chip
      size={size}
      variant={variant}
      label={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {statusKey ? (
            <span aria-hidden style={{ fontFamily: theme.stark.mono, fontSize: 10, lineHeight: 1 }}>
              {STATUS_GLYPH[statusKey]}
            </span>
          ) : null}
          {config.label}
        </span>
      }
      aria-label={statusKey ? `${config.label} (${STATUS_LABEL[statusKey]})` : config.label}
      sx={{
        borderRadius: radius.chip,
        borderColor: tint ?? theme.stark.hairlineStrong,
        ...(fill && tint ? { backgroundColor: fill, color: tint } : null),
        ...(tint ? { '& .MuiChip-label': { color: tint } } : null),
        fontWeight: 500,
      }}
    />
  )
}

/**
 * Compact availability capsule: one coloured dot + the free count. Used on
 * place cards where the number is the point and the label would be noise.
 */
export function AvailabilityDot({ free, total, size = 7 }: { free: number; total: number; size?: number }) {
  const theme = useTheme()
  const key: StatusKey = total === 0 || free === 0 ? 'occupied' : free / total <= 0.15 ? 'reserved' : 'free'
  const tint = theme.stark.status[key]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: tint,
          boxShadow: `0 0 0 3px ${theme.stark.statusDim[key]}`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{free}</span>
    </span>
  )
}
