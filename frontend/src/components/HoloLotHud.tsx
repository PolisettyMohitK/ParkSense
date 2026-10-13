import type { CSSProperties } from 'react'
import { IconButton, Tooltip, useTheme } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded'
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import { CornerTicks, LiveDot } from './Stark'
import type { HoloLotMode } from '../three/HoloLotTypes'

export interface HoloLotCounts {
  free: number
  occupied: number
  reserved: number
  offline: number
}

/**
 * The DOM overlay. Five elements at most: zone + live counters (top-left),
 * compass and controls (top-right), connection dot (bottom-left). The 3D/2D
 * toggle and reset live inside the control cluster.
 */
export default function HoloLotHud({
  zoneName,
  counts,
  total,
  compassDeg,
  mode,
  labels,
  canZoom,
  onModeChange,
  onToggleLabels,
  onReset,
}: {
  zoneName?: string
  counts: HoloLotCounts
  total: number
  compassDeg: number
  mode: HoloLotMode
  labels: boolean
  canZoom: boolean
  onModeChange: (mode: HoloLotMode) => void
  onToggleLabels: () => void
  onReset: () => void
}) {
  const theme = useTheme()
  return (
    <div style={layer}>
      <CornerTicks color={theme.stark.holo} sx={{ top: 10, right: 10, bottom: 10, left: 10, width: 12, height: 12, position: 'absolute' }} />

      <div style={readout}>
        {zoneName ? <span style={zoneNameStyle}>{zoneName}</span> : null}
        <span style={counterRow}>
          <span>
            <span style={{ color: theme.stark.status.free }}>{counts.free}</span> free
          </span>
          <span>
            <span style={{ color: theme.stark.status.occupied }}>{counts.occupied}</span> occupied
          </span>
          {counts.reserved > 0 ? (
            <span>
              <span style={{ color: theme.stark.status.reserved }}>{counts.reserved}</span> reserved
            </span>
          ) : null}
          {total > 0 ? <span style={{ color: theme.palette.text.tertiary }}>/ {total}</span> : null}
        </span>
      </div>

      <HudControls
        compassDeg={compassDeg}
        mode={mode}
        labels={labels}
        canZoom={canZoom}
        onModeChange={onModeChange}
        onToggleLabels={onToggleLabels}
        onReset={onReset}
      />

      <div style={liveRow}>
        <LiveDot />
        <span style={liveLabel}>LIVE</span>
      </div>
    </div>
  )
}

function HudControls({
  compassDeg,
  mode,
  labels,
  canZoom,
  onModeChange,
  onToggleLabels,
  onReset,
}: {
  compassDeg: number
  mode: HoloLotMode
  labels: boolean
  canZoom: boolean
  onModeChange: (mode: HoloLotMode) => void
  onToggleLabels: () => void
  onReset: () => void
}) {
  const theme = useTheme()
  return (
    <div style={controls}>
      <Tooltip title="North">
        <span aria-hidden style={compass(compassDeg)}>
          <svg width="14" height="14" viewBox="0 0 14 14" focusable="false">
            <path d="M7 1 L10 12 L7 9.5 L4 12 Z" fill={theme.stark.holo} />
          </svg>
        </span>
      </Tooltip>
      {canZoom ? (
        <Tooltip title="Zoom in">
          <IconButton size="small" aria-label="Zoom in">
            <AddRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      {canZoom ? (
        <Tooltip title="Zoom out">
          <IconButton size="small" aria-label="Zoom out">
            <RemoveRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      <Tooltip title="Reset view">
        <IconButton size="small" aria-label="Reset view" onClick={onReset}>
          <CenterFocusStrongRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Toggle bay labels">
        <IconButton size="small" aria-label="Toggle bay labels" aria-pressed={labels} onClick={onToggleLabels}>
          <ViewInArRoundedIcon fontSize="small" style={{ color: labels ? theme.stark.holo : undefined }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={mode === '3d' ? 'Switch to plan view' : 'Switch to 3D view'}>
        <IconButton
          size="small"
          aria-label={mode === '3d' ? 'Switch to plan view' : 'Switch to 3D view'}
          aria-pressed={mode === '2d'}
          onClick={() => onModeChange(mode === '3d' ? '2d' : '3d')}
        >
          {mode === '3d' ? <MapRoundedIcon fontSize="small" /> : <ViewInArRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </div>
  )
}

const layer: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  pointerEvents: 'none',
  zIndex: 3,
}

const readout: CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const zoneNameStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

const counterRow: CSSProperties = {
  display: 'flex',
  gap: 14,
  fontFamily: 'var(--font-mono)',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 12,
  lineHeight: 1.4,
  color: 'var(--color-text-primary)',
}

const controls: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 18,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  pointerEvents: 'auto',
}

function compass(deg: number): CSSProperties {
  return {
    width: 26,
    height: 26,
    display: 'grid',
    placeItems: 'center',
    transform: `rotate(${-deg}deg)`,
    transition: `transform 420ms cubic-bezier(0.2,0.8,0.2,1)`,
  }
}

const liveRow: CSSProperties = {
  position: 'absolute',
  bottom: 18,
  left: 24,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const liveLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.1em',
  color: 'var(--color-text-tertiary)',
}
