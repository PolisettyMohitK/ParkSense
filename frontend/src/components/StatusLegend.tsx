import { statusKeyFor, type StatusKey } from '../theme'
import type { SpaceStatus } from '../types'

const ORDER: SpaceStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE']

/**
 * Status is never colour alone: every swatch carries the same glyph the scene
 * draws, so the legend doubles as a key for the 3D and 2D renderers.
 */
export default function StatusLegend() {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 18, margin: '20px 0 0', padding: 0 }}>
      {ORDER.map((status) => {
        const key = statusKeyFor(status) as StatusKey
        return (
          <li key={status} data-status={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <StatusSwatch status={status} />
            <span style={label}>{status.replace(/_/g, ' ').toLowerCase()}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function StatusSwatch({ status }: { status: SpaceStatus }) {
  return (
    <span
      data-status={statusKeyFor(status)}
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        border: `1.5px solid var(--color-status-${statusKeyFor(status)})`,
        background: `var(--color-status-${statusKeyFor(status)}-dim)`,
      }}
    />
  )
}

const label: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-secondary)',
  textTransform: 'capitalize',
}
