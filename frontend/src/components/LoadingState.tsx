import { Skeleton, useTheme } from '@mui/material'
import { radius } from '../theme'

/**
 * Route-level Suspense fallback. Reserves layout height so the shell never
 * jumps, and uses the same shimmer as every other placeholder.
 */
export default function LoadingState({ minHeight = 240 }: { minHeight?: number }) {
  const theme = useTheme()
  return (
    <div style={{ minHeight }} aria-busy="true" aria-live="polite">
      <Skeleton
        animation="wave"
        variant="rounded"
        height={Math.min(minHeight, 320)}
        sx={{ borderRadius: radius.panel, bgcolor: theme.stark.hairline }}
      />
    </div>
  )
}
