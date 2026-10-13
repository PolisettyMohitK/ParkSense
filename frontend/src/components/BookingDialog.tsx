import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { NumericReadout } from './Stark'
import { placesApi } from '../api/places'
import { reservationsApi } from '../api/reservations'
import { usersApi, vehiclesApi } from '../api/resources'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAppSelector } from '../store/hooks'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { bookingWindowProblem } from '../utils/validation'
import { defaultBookingWindow, formatMoney, toLocalInputValue } from '../utils/format'
import type { Reservation } from '../types'

export interface BookingTarget {
  siteId?: number | null
  zoneId?: number | null
  spaceId?: number | null
}

interface BookingDialogProps {
  open: boolean
  onClose: () => void
  initial?: BookingTarget
  onBooked?: (reservation: Reservation) => void
}

const HOLD_WINDOW_MS = 15 * 60_000

/** Place → area → (optional) bay → vehicle → time, with a live price quote from the server. */
export default function BookingDialog({ open, onClose, initial, onBooked }: BookingDialogProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAppSelector((state) => state.auth.user)
  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'

  const [siteId, setSiteId] = useState<number | ''>('')
  const [zoneId, setZoneId] = useState<number | ''>('')
  const [spaceId, setSpaceId] = useState<number | ''>('')
  const [driverId, setDriverId] = useState<number | ''>('')
  const [step, setStep] = useState(0)
  const [vehicleId, setVehicleId] = useState<number | ''>('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  // Fresh defaults every time the dialog opens, so "now" is never stale.
  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const defaults = defaultBookingWindow()
    setSiteId(initial?.siteId ?? '')
    setZoneId(initial?.zoneId ?? '')
    setSpaceId(initial?.spaceId ?? '')
    setDriverId(currentUser?.id ?? '')
    setVehicleId('')
    // Picking a specific bay usually means "I'm here now"; otherwise suggest the next quarter hour.
    setStart(initial?.spaceId ? toLocalInputValue(new Date()) : defaults.start)
    setEnd(initial?.spaceId ? toLocalInputValue(new Date(Date.now() + 2 * 3_600_000)) : defaults.end)
  }, [open, initial?.siteId, initial?.zoneId, initial?.spaceId, currentUser?.id])

  const sitesQuery = useQuery({
    queryKey: queryKeys.places.list({}),
    queryFn: () => placesApi.search({}),
    enabled: open,
  })
  const zonesQuery = useQuery({
    queryKey: queryKeys.places.zones(Number(siteId)),
    queryFn: () => placesApi.zones(Number(siteId)),
    enabled: open && siteId !== '',
  })
  const spacesQuery = useQuery({
    queryKey: queryKeys.places.spaces(Number(siteId), Number(zoneId)),
    queryFn: () => placesApi.spaces(Number(siteId), Number(zoneId)),
    enabled: open && siteId !== '' && zoneId !== '',
  })
  const usersQuery = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => usersApi.list(),
    enabled: open && isStaff,
  })
  const ownerId = isStaff ? (driverId === '' ? undefined : Number(driverId)) : undefined
  const vehiclesQuery = useQuery({
    queryKey: queryKeys.vehicles.list(ownerId),
    queryFn: () => vehiclesApi.list(ownerId),
    enabled: open && (!isStaff || driverId !== ''),
  })
  const vehicles = (vehiclesQuery.data ?? []).filter((vehicle) => vehicle.active)

  // Pre-select the only vehicle, or the first one, once they load.
  useEffect(() => {
    if (open && vehicleId === '' && vehicles.length > 0) {
      setVehicleId(vehicles[0].id)
    }
  }, [open, vehicleId, vehicles])

  const startDate = useMemo(() => new Date(start), [start])
  const endDate = useMemo(() => new Date(end), [end])
  const windowError = start && end ? bookingWindowProblem({ start: startDate, end: endDate }) : 'Pick a start and end time'
  const startsSoon = !Number.isNaN(startDate.getTime()) && startDate.getTime() <= Date.now() + HOLD_WINDOW_MS

  const quoteKey = useDebouncedValue(
    !windowError && siteId !== '' ? { siteId: Number(siteId), start: startDate.toISOString(), end: endDate.toISOString() } : null,
    350,
  )
  const quoteQuery = useQuery({
    queryKey: ['quote', quoteKey],
    queryFn: () => placesApi.quote(quoteKey!.siteId, quoteKey!.start, quoteKey!.end),
    enabled: open && quoteKey !== null,
  })

  const selectedZone = zonesQuery.data?.find((zone) => zone.id === zoneId)
  const selectedSpace = spacesQuery.data?.find((space) => space.id === spaceId)

  const createMutation = useMutation({
    mutationFn: () =>
      reservationsApi.create({
        userId: isStaff && driverId !== '' ? Number(driverId) : undefined,
        vehicleId: Number(vehicleId),
        zoneId: Number(zoneId),
        assignedSpaceId: spaceId === '' ? null : Number(spaceId),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      }),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      enqueueSnackbar(
        `Booked ${reservation.assignedSpaceCode ? `bay ${reservation.assignedSpaceCode}` : 'a bay'} · ${reservation.code}`,
        { variant: 'success' },
      )
      onBooked?.(reservation)
      onClose()
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const canSubmit =
    siteId !== '' && zoneId !== '' && vehicleId !== '' && !windowError && !createMutation.isPending
  const canAdvance = step === 0 ? siteId !== '' && zoneId !== '' : vehicleId !== '' && start !== '' && end !== ''

  return (
    <Dialog open={open} onClose={createMutation.isPending ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={stepperTitle}>{STEP_LABELS[step]}</DialogTitle>
      <DialogContent>
        <StepRail step={step} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* Step 1 — Where: place, area, bay */}
          {step === 0 && isStaff ? (
            <TextField
              select
              label="Driver"
              value={driverId}
              onChange={(event) => {
                setDriverId(Number(event.target.value))
                setVehicleId('')
              }}
              helperText="Staff can book on behalf of a driver"
              fullWidth
            >
              {(usersQuery.data ?? []).map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName} · {user.email}
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {step === 0 ? (
            <>
          <TextField
            select
            label="Place"
            value={siteId}
            onChange={(event) => {
              setSiteId(Number(event.target.value))
              setZoneId('')
              setSpaceId('')
            }}
            fullWidth
            disabled={sitesQuery.isLoading}
            helperText={sitesQuery.isError ? apiErrorMessage(sitesQuery.error) : undefined}
            error={sitesQuery.isError}
          >
            {(sitesQuery.data ?? []).map((place) => (
              <MenuItem key={place.siteId} value={place.siteId}>
                {place.name}
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {place.hourlyRate ? `${formatMoney(place.hourlyRate)}/h` : 'Free'} · {place.availableSpaces} free
                </Typography>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Parking area"
            value={zoneId}
            onChange={(event) => {
              setZoneId(Number(event.target.value))
              setSpaceId('')
            }}
            fullWidth
            disabled={siteId === '' || zonesQuery.isLoading}
          >
            {(zonesQuery.data ?? []).map((zone) => (
              <MenuItem key={zone.id} value={zone.id}>
                {zone.name}
                {zone.floor ? ` · ${zone.floor}` : ''} ({zone.availableSpaces} of {zone.totalSpaces} free)
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Bay"
            value={spaceId}
            onChange={(event) => setSpaceId(event.target.value === '' ? '' : Number(event.target.value))}
            fullWidth
            disabled={zoneId === '' || spacesQuery.isLoading}
            helperText="Leave on auto-assign and we pick a free bay for your time slot"
            SelectProps={{ displayEmpty: true }}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">Auto-assign</MenuItem>
            {(spacesQuery.data ?? []).map((space) => {
              const blocked =
                space.status === 'OUT_OF_SERVICE' || (startsSoon && space.status !== 'AVAILABLE')
              return (
                <MenuItem key={space.id} value={space.id} disabled={blocked}>
                  {space.code}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {space.status === 'AVAILABLE' ? 'free now' : space.status.toLowerCase().replace('_', ' ')}
                  </Typography>
                </MenuItem>
              )
            })}
          </TextField>
            </>
          ) : null}

          {/* Step 2 — When: vehicle, arrival window */}
          {step >= 1 ? (
            <>
          <TextField
            select
            label="Vehicle"
            value={vehicleId}
            onChange={(event) => setVehicleId(Number(event.target.value))}
            fullWidth
            disabled={vehiclesQuery.isLoading || vehicles.length === 0}
          >
            {vehicles.map((vehicle) => (
              <MenuItem key={vehicle.id} value={vehicle.id}>
                {vehicle.plateNumber}
                {vehicle.make ? ` · ${vehicle.make} ${vehicle.model ?? ''}` : ''}
              </MenuItem>
            ))}
          </TextField>
          {!vehiclesQuery.isLoading && vehicles.length === 0 && (!isStaff || driverId !== '') && (
            <Alert
              severity="info"
              action={
                !isStaff || driverId === currentUser?.id ? (
                  <Button component={RouterLink} to="/vehicles" size="small" onClick={onClose}>
                    Add vehicle
                  </Button>
                ) : undefined
              }
            >
              {isStaff && driverId !== currentUser?.id
                ? 'This driver has no vehicles registered.'
                : 'Add a vehicle before booking.'}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="From"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: toLocalInputValue(new Date()) }}
            />
            <TextField
              label="Until"
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: start || undefined }}
            />
          </Stack>
            </>
          ) : null}

          {/* Step 3 — Confirm: the server quote */}
          {step < 2 ? null : windowError ? (
            <Alert severity="warning">{windowError}</Alert>
          ) : (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <SummaryRow label="Area" value={selectedZone?.name ?? '—'} />
                <SummaryRow label="Bay" value={selectedSpace?.code ?? 'Auto-assigned'} />
                <SummaryRow
                  label="Duration"
                  value={quoteQuery.data ? `${quoteQuery.data.billableHours} h billed` : '—'}
                />
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={700}>Estimated price</Typography>
                  {quoteQuery.isFetching ? (
                    <QuoteShimmer />
                  ) : quoteQuery.data ? (
                    quoteQuery.data.complimentary ? (
                      <NumericReadout value={0} suffix="Free" size={26} color="var(--color-status-free)" />
                    ) : (
                      <NumericReadout value={quoteQuery.data.amount} prefix="₹" size={26} duration={300} />
                    )
                  ) : (
                    <NumericReadout value={0} prefix="₹" size={26} color="var(--color-text-tertiary)" />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {quoteQuery.data?.complimentary
                    ? 'Complimentary parking for visitors - nothing to pay.'
                    : 'Charged per started hour for the slot you hold; staying longer is billed at check-out. ' +
                      'Bookings not checked in within 15 minutes of the start time expire.'}
                </Typography>
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={step === 0 ? onClose : () => setStep((value) => value - 1)} disabled={createMutation.isPending}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 2 ? (
          <Button variant="contained" onClick={() => setStep((value) => value + 1)} disabled={!canAdvance}>
            Continue
          </Button>
        ) : (
          <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!canSubmit}>
            {createMutation.isPending ? 'Booking…' : 'Confirm booking'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

const STEP_LABELS = ['Where', 'When', 'Confirm'] as const

/** Three quiet ticks. The active step is the only one lit. */
function StepRail({ step }: { step: number }) {
  return (
    <div style={stepRail}>
      {STEP_LABELS.map((label, index) => {
        const lit = index <= step
        return (
          <div key={label} style={{ flex: 1, gap: 6 }}>
            <div style={{ height: 2, background: lit ? 'var(--color-holo)' : 'var(--color-hairline)' }} />
            <span style={{ ...stepLabel, color: index === step ? 'var(--color-holo)' : 'var(--color-text-tertiary)' }}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Shimmer placeholder. A spinner is only ever used inside a button. */
function QuoteShimmer() {
  return (
    <div style={shimmer}>
      <div style={shimmerSweep} />
    </div>
  )
}

const stepperTitle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--color-text-secondary)',
}

const stepRail: import('react').CSSProperties = { display: 'flex', gap: 10, marginTop: 4 }

const stepLabel: import('react').CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const shimmer: import('react').CSSProperties = {
  height: 20,
  width: 110,
  borderRadius: 6,
  background: 'var(--color-hairline)',
  overflow: 'hidden',
  position: 'relative',
}

const shimmerSweep: import('react').CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(90deg, transparent, var(--color-holo-soft), transparent)',
  animation: 'starkShimmer 1400ms ease-in-out infinite',
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  )
}
