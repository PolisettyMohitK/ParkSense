import type { ReactElement } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { motion } from 'framer-motion'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactElement
  accent?: string
  hint?: string
}

export default function StatCard({ label, value, icon, accent, hint }: StatCardProps) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}>
      <Card sx={{ position: 'relative', overflow: 'hidden' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="overline" color="text.secondary" letterSpacing={0.8}>
                {label}
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                {value}
              </Typography>
              {hint && (
                <Typography variant="caption" color="text.secondary">
                  {hint}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                color: accent ?? 'text.primary',
                bgcolor: accent ? `${accent}18` : 'action.hover',
                border: '1px solid',
                borderColor: accent ? `${accent}33` : 'divider',
              }}
            >
              {icon}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  )
}
