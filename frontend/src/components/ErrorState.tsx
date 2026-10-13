import type { CSSProperties, ReactElement } from 'react'
import { Button, Stack, Typography, useTheme } from '@mui/material'
import { radius } from '../theme'

interface ErrorStateProps {
  title?: string
  subtitle?: string
  onRetry?: () => void
  retryLabel?: string
  icon?: ReactElement
}

export default function ErrorState({
  title = 'Something went wrong',
  subtitle = 'An unexpected error occurred while loading this content.',
  onRetry,
  retryLabel = 'Try again',
  icon,
}: ErrorStateProps) {
  const theme = useTheme()

  const badge: CSSProperties = {
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radius.panel,
    border: `1px solid ${theme.stark.status.occupied}`,
    color: theme.stark.status.occupied,
    backgroundColor: theme.stark.statusDim.occupied,
  }

  const glyph =
    icon ??
    (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" focusable="false">
        <path d="M10 3.5 18 16.5H2L10 3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M10 8.4v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10" cy="14" r="0.9" fill="currentColor" />
      </svg>
    )

  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.75} sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <div aria-hidden style={badge}>
        {glyph}
      </div>
      <Typography sx={{ fontSize: 16, fontWeight: 600, color: theme.palette.text.primary }}>{title}</Typography>
      {subtitle ? (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, maxWidth: 440 }}>
          {subtitle}
        </Typography>
      ) : null}
      {onRetry ? (
        <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>
          {retryLabel}
        </Button>
      ) : null}
    </Stack>
  )
}
