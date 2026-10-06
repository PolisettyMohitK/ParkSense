import { Box, CircularProgress } from '@mui/material'

export default function LoadingState({ minHeight = 240 }: { minHeight?: number }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight }}>
      <CircularProgress />
    </Box>
  )
}
