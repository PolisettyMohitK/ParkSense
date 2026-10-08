import { Chip, type ChipProps } from '@mui/material'

type Color = ChipProps['color']

const SPACE_STATUS: Record<string, { label: string; color: Color }> = {
  AVAILABLE: { label: 'Available', color: 'success' },
  OCCUPIED: { label: 'Occupied', color: 'error' },
  RESERVED: { label: 'Reserved', color: 'warning' },
  OUT_OF_SERVICE: { label: 'Out of service', color: 'default' },
}

const VERIFICATION: Record<string, { label: string; color: Color }> = {
  PROPOSED: { label: 'Proposed', color: 'info' },
  VERIFIED: { label: 'Verified', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
}

const RESERVATION: Record<string, { label: string; color: Color }> = {
  PENDING: { label: 'Pending', color: 'info' },
  CONFIRMED: { label: 'Confirmed', color: 'primary' },
  ACTIVE: { label: 'Active', color: 'success' },
  COMPLETED: { label: 'Completed', color: 'default' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
  EXPIRED: { label: 'Expired', color: 'warning' },
}

const DEVICE: Record<string, { label: string; color: Color }> = {
  ONLINE: { label: 'Online', color: 'success' },
  OFFLINE: { label: 'Offline', color: 'default' },
  MAINTENANCE: { label: 'Maintenance', color: 'warning' },
}

type Kind = 'space' | 'verification' | 'reservation' | 'device'

const MAPS: Record<Kind, Record<string, { label: string; color: Color }>> = {
  space: SPACE_STATUS,
  verification: VERIFICATION,
  reservation: RESERVATION,
  device: DEVICE,
}

interface StatusChipProps {
  kind: Kind
  value: string
  size?: ChipProps['size']
  variant?: ChipProps['variant']
}

export default function StatusChip({ kind, value, size = 'small', variant = 'outlined' }: StatusChipProps) {
  const config = MAPS[kind][value] ?? { label: value, color: 'default' as Color }
  return <Chip size={size} variant={variant} color={config.color} label={config.label} />
}
