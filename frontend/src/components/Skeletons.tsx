import type { CSSProperties } from 'react'
import { Skeleton, Stack, useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { radius } from '../theme'

/** Shared shimmer block. Never a spinner for content. */
function Slab({
  width,
  height,
  corner,
}: {
  width?: number | string
  height?: number | string
  corner?: number
}) {
  const theme = useTheme()
  return (
    <Skeleton
      variant="rounded"
      animation="wave"
      width={width}
      height={height}
      sx={{ borderRadius: corner ?? radius.chip, bgcolor: theme.stark.hairline }}
    />
  )
}

/** Quiet line placeholder. */
export function TextSkeleton({ width = '100%', height = 14 }: { width?: number | string; height?: number }) {
  return <Slab width={width} height={height} />
}

export function PlaceCardSkeleton() {
  return (
    <div style={skeletonCard}>
      <Slab width="100%" height="100%" corner={0} />
    </div>
  )
}

export function PlaceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={grid}>
      {Array.from({ length: count }, (_, index) => (
        <PlaceCardSkeleton key={index} />
      ))}
    </div>
  )
}

/**
 * Reserves the HoloLot's exact footprint so the page never shifts when the 3D
 * chunk resolves.
 */
export function HoloLotSkeleton({ height = 420 }: { height?: number }) {
  return (
    <div style={{ ...holoSkeleton, height }}>
      <Slab width="100%" height="100%" corner={0} />
    </div>
  )
}

export function PlaceDetailSkeleton() {
  return (
    <div>
      <HoloLotSkeleton height={440} />
      <Stack spacing={1.5} sx={{ mt: 3 }}>
        <Slab width={120} height={11} />
        <Slab width="46%" height={30} />
        <Slab width="30%" height={16} />
      </Stack>
    </div>
  )
}

/** Generic page-level placeholder used by Suspense fallbacks. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  const theme = useTheme()
  return (
    <Stack spacing={2}>
      <Slab width={140} height={11} />
      <Slab width="38%" height={28} />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={panel(theme)}>
          <Slab width="34%" height={12} />
        </div>
      ))}
    </Stack>
  )
}

const grid: CSSProperties = {
  display: 'grid',
  gap: 24,
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
}

const skeletonCard: CSSProperties = {
  aspectRatio: '16 / 13.5',
  border: '1px solid var(--color-hairline)',
  borderRadius: 'var(--radius-panel)',
  overflow: 'hidden',
}

const holoSkeleton: CSSProperties = {
  position: 'relative',
  borderRadius: 'var(--radius-panel)',
  border: '1px solid var(--color-hairline)',
  overflow: 'hidden',
}

const panel = (theme: Theme): CSSProperties => ({
  padding: 20,
  border: `1px solid ${theme.stark.hairline}`,
  borderRadius: radius.panel,
  backgroundColor: theme.stark.surface,
})
