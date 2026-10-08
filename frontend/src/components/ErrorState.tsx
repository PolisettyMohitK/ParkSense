import type { ReactNode } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'

interface ErrorStateProps {
  title?: string
  subtitle?: string
  onRetry?: () => void
  retryLabel?: string
  icon?: ReactNode
}

export default function ErrorState({
  title = 'Something went wrong',
  subtitle = 'An unexpected error occurred while loading this content.',
  onRetry,
  retryLabel = 'Try again',
  icon,
}: ErrorStateProps) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ color: 'error.main', fontSize: 48, display: 'grid', placeItems: 'center' }}>
        {icon ?? <ErrorOutlineRoundedIcon sx={{ fontSize: 48 }} />}
      </Box>
      <Typography variant="h6">{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" maxWidth={460}>
          {subtitle}
        </Typography>
      )}
      {onRetry && (
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<RefreshRoundedIcon />}
          onClick={onRetry}
          sx={{ mt: 1 }}
        >
          {retryLabel}
        </Button>
      )}
    </Stack>
  )
}
