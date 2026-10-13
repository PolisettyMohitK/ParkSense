import { useMemo } from 'react'
import { useTheme } from '@mui/material'
import HoloLot from './HoloLot'
import type { HoloLotBay, HoloLotPalette } from '../three/HoloLotTypes'

/**
 * A generic lot used as ambient scenery — the sign-in hero, the empty states and
 * anything that wants the product's signature without real data behind it.
 *
 * Deterministic: the same seed always yields the same slab, bays and cars, so
 * the hero never flickers between renders.
 */
const STATUS_CYCLE: HoloLotBay['status'][] = [
  'AVAILABLE',
  'OCCUPIED',
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'OCCUPIED',
  'AVAILABLE',
  'OCCUPIED',
]

function idleLot(columns = 8, rows = 5): HoloLotBay[] {
  const bays: HoloLotBay[] = []
  for (let i = 0; i < columns * rows; i += 1) {
    const row = Math.floor(i / columns)
    const col = i % columns
    // Centre the two rows of bays around a central aisle.
    const y = row === 0 ? 0 : 300
    bays.push({
      id: i + 1,
      code: `${String.fromCharCode(65 + row)}${String(col + 1).padStart(2, '0')}`,
      status: STATUS_CYCLE[(i * 5 + row * 3) % STATUS_CYCLE.length],
      positionX: col * 122,
      positionY: y + 56,
    })
  }
  return bays
}

export default function IdleLotScene({
  height,
  seed = 'parksense-idle',
  bays,
}: {
  height?: number | string
  seed?: string
  bays?: HoloLotBay[]
}) {
  const theme = useTheme()
  const palette: HoloLotPalette = useMemo(
    () => ({
      holo: theme.stark.holo,
      holoSoft: theme.stark.holoSoft,
      arc: theme.stark.arc,
      hairline: theme.stark.hairline,
      hairlineStrong: theme.stark.hairlineStrong,
      canvas: theme.palette.background.default,
      surface: theme.palette.background.paper,
      surfaceRaised: theme.stark.surfaceRaised,
      textPrimary: theme.palette.text.primary,
      textSecondary: theme.palette.text.secondary,
      status: theme.stark.status,
      light: theme.palette.mode === 'light',
    }),
    [theme],
  )

  return (
    <HoloLot
      siteId={0}
      zoneId={0}
      seed={seed}
      bays={bays ?? idleLot()}
      height={height}
      idle
      hud={false}
      paletteOverride={palette}
    />
  )
}
