import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ParkingZone } from '../types'

/**
 * One thin row per area: name, occupancy bar, mono ratio. Rows are the only
 * thing on this panel — no nested cards.
 */
export default function ZoneCapacityList({
  zones,
  siteNames,
}: {
  zones: ParkingZone[]
  siteNames: Record<number, string>
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState<number | null>(null)
  const sorted = [...zones].sort(
    (a, b) => (b.totalSpaces ? b.occupiedSpaces / b.totalSpaces : 0) - (a.totalSpaces ? a.occupiedSpaces / a.totalSpaces : 0),
  )

  if (sorted.length === 0) {
    return <p style={idle}>No zones configured yet.</p>
  }

  return (
    <ul style={list}>
      {sorted.map((zone) => {
        const rate = zone.totalSpaces === 0 ? 0 : (zone.occupiedSpaces / zone.totalSpaces) * 100
        const open = expanded === zone.id
        const tone = rate > 80 ? 'var(--color-status-occupied)' : rate > 55 ? 'var(--color-status-reserved)' : 'var(--color-status-free)'
        return (
          <li key={zone.id}>
            <button
              type="button"
              onClick={() => setExpanded(open ? null : zone.id)}
              aria-expanded={open}
              style={row}
            >
              <span style={label}>
                {zone.name}
                {zone.floor ? <span style={floor}>{zone.floor}</span> : null}
              </span>
              <span style={barTrack}>
                <span style={{ ...barFill, width: `${Math.min(100, rate)}%`, background: tone }} />
              </span>
              <span style={ratio}>
                {zone.occupiedSpaces}/{zone.totalSpaces}
              </span>
            </button>
            {open ? (
              <div style={detail}>
                <span>{siteNames[zone.siteId] ?? zone.siteName}</span>
                <button type="button" style={link} onClick={() => navigate(`/zones/${zone.id}`)}>
                  Open in operator mode →
                </button>
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

const list: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  width: '100%',
  padding: '10px 0',
  border: 0,
  borderTop: '1px solid var(--color-hairline)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
}

const label: CSSProperties = {
  flex: '0 0 30%',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 8,
}

const floor: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--color-text-tertiary)',
}

const barTrack: CSSProperties = {
  flex: 1,
  height: 3,
  borderRadius: 999,
  background: 'var(--color-hairline)',
  overflow: 'hidden',
}

const barFill: CSSProperties = {
  display: 'block',
  height: '100%',
  borderRadius: 999,
  transition: 'width 420ms cubic-bezier(0.2,0.8,0.2,1)',
}

const ratio: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--color-text-secondary)',
  flexShrink: 0,
}

const detail: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '0 0 12px',
  fontSize: 13,
  color: 'var(--color-text-secondary)',
}

const link: CSSProperties = {
  border: 0,
  background: 'transparent',
  padding: 0,
  color: 'var(--color-holo)',
  font: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
}

const idle: CSSProperties = { fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }
