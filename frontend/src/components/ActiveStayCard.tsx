import { useQuery } from '@tanstack/react-query'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded'
import { formatDistanceToNowStrict } from 'date-fns'
import { mySessionsApi } from '../api/sessions'
import { queryKeys } from '../api/queryKeys'
import { formatMoney } from '../utils/format'
import { useStayActions } from '../hooks/useStayActions'

/** "You are parked" banner with the running charge and a one-tap check-out. Renders nothing when not parked. */
export default function ActiveStayCard() {
  const { data: stay } = useQuery({
    queryKey: queryKeys.mySessions.active,
    queryFn: mySessionsApi.active,
    refetchInterval: 60_000,
  })
  const { checkOut, paymentDialog } = useStayActions()

  if (!stay) return paymentDialog

  return (
    <>
      <Card
        sx={{
          mb: 3,
          borderColor: 'success.main',
          borderWidth: 1,
          borderStyle: 'solid',
          background: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(48,209,88,0.08)' : 'rgba(52,199,89,0.06)',
        }}
      >
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'success.main',
                color: 'success.contrastText',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <LocalParkingRoundedIcon />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700}>
                Parked at {stay.siteName ?? 'your venue'} · bay {stay.spaceCode ?? '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stay.zoneName} · {stay.plateNumber ?? 'vehicle'} · since{' '}
                {formatDistanceToNowStrict(new Date(stay.checkInAt))} ago
              </Typography>
            </Box>
            <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}>
              <Typography variant="h6" fontWeight={800}>
                {stay.hourlyRate ? formatMoney(stay.amount, stay.currency ?? 'INR') : 'Free'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stay.hourlyRate ? `so far · ${formatMoney(stay.hourlyRate)}/h` : 'complimentary'}
              </Typography>
            </Stack>
            {stay.reservationId && (
              <Button
                variant="contained"
                color="success"
                disabled={checkOut.isPending}
                onClick={() => checkOut.mutate(stay.reservationId!)}
              >
                {checkOut.isPending ? 'Checking out…' : 'Check out'}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
      {paymentDialog}
    </>
  )
}
