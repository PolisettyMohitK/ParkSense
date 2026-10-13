import type { CSSProperties } from 'react'
import { NumericReadout } from './Stark'
import type { ZoneOccupancy } from '../types'

/**
 * Compact occupancy HUD strip. Four instrument readouts separated by hairlines
 * instead of four cards.
 */
export default function OccupancyStrip({ occupancy }: { occupancy: ZoneOccupancy }) {
  const items: Array<{ label: string; value: number; tint?: string }> = [
    { label: 'Total', value: occupancy.totalSpaces },
    { label: 'Occupied', value: occupancy.occupied, tint: 'var(--color-status-occupied)' },
    { label: 'Free', value: occupancy.available, tint: 'var(--color-status-free)' },
    { label: 'Reserved', value: occupancy.reserved, tint: 'var(--color-status-reserved)' },
  ]

  return (
    <div style={strip}>
      {items.map((item, index) => (
        <div key={item.label} style={{ ...cell, borderLeft: index === 0 ? 0 : '1px solid var(--color-hairline)' }}>
          <span style={label}>{item.label}</span>
          <NumericReadout value={item.value} size={22} color={item.tint} />
        </div>
      ))}
    </div>
  )
}

const strip: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
  marginBottom: 20,
  padding: '14px 4px',
  borderRadius: 'var(--radius-panel)',
  border: '1px solid var(--color-hairline)',
}

const cell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '0 18px',
}

const label: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}
