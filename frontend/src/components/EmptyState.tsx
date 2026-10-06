import type { ReactNode } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import InboxRoundedIcon from '@mui/icons-material/InboxRounded'

interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
  icon?: ReactNode
}

export default function EmptyState({ title, subtitle, action, icon }: EmptyStateProps) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ color: 'text.secondary', fontSize: 48, display: 'grid', placeItems: 'center' }}>
        {icon ?? <InboxRoundedIcon sx={{ fontSize: 48 }} />}
      </Box>
      <Typography variant="h6">{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" maxWidth={420}>
          {subtitle}
        </Typography>
      )}
      {action && (
        <Button variant="contained" onClick={action.onClick} sx={{ mt: 1 }}>
          {action.label}
        </Button>
      )}
    </Stack>
  )
}
