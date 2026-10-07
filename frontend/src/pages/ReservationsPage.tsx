import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  TextField,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { useSnackbar } from 'notistack'
import { format } from 'date-fns'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import StatusChip from '../components/StatusChip'
import { reservationsApi } from '../api/reservations'
import { sessionsApi } from '../api/sessions'
import { zonesApi, spacesApi } from '../api/parking'
import { vehiclesApi, usersApi } from '../api/resources'
import { apiErrorMessage } from '../api/client'
import { useAppSelector } from '../store/hooks'

interface ReservationForm {
  userId: number | ''
  vehicleId: number | ''
  zoneId: number | ''
  assignedSpaceId: number | ''
  startTime: string
  endTime: string
}

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

const now = new Date()
const defaultForm: ReservationForm = {
  userId: '',
  vehicleId: '',
  zoneId: '',
  assignedSpaceId: '',
  startTime: toLocalInput(now),
  endTime: toLocalInput(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
}

export default function ReservationsPage() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAppSelector((state) => state.auth.user)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState<'reservations' | 'sessions'>('reservations')
  const [form, setForm] = useState<ReservationForm>({ ...defaultForm, userId: currentUser?.id ?? '' })
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const zoneParam = searchParams.get('zoneId')
    if (zoneParam) {
      setForm((previous) => ({ ...previous, zoneId: Number(zoneParam), userId: currentUser?.id ?? '' }))
      setDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, currentUser])

  const reservationsQuery = useQuery({ queryKey: ['reservations'], queryFn: () => reservationsApi.list() })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const vehiclesQuery = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list() })
  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const spacesQuery = useQuery({
    queryKey: ['spaces', form.zoneId],
    queryFn: () => spacesApi.list(Number(form.zoneId)),
    enabled: form.zoneId !== '',
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations'] })
    queryClient.invalidateQueries({ queryKey: ['spaces'] })
    queryClient.invalidateQueries({ queryKey: ['zones'] })
  }

  /** Surfaces problems before the round-trip, so the user is not left guessing. */
  const timeError = (() => {
    if (!form.startTime || !form.endTime) return 'Pick a start and end time.'
    const start = new Date(form.startTime).getTime()
    const end = new Date(form.endTime).getTime()
    if (Number.isNaN(start) || Number.isNaN(end)) return 'Enter a valid date and time.'
    if (end <= start) return 'End time must be after the start time.'
    if (start < Date.now() - 60_000) return 'Start time cannot be in the past.'
    return null
  })()

  const hours = (() => {
    if (timeError) return 0
    return (new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / 3_600_000
  })()

  const selectedZone = (zonesQuery.data ?? []).find((zone) => zone.id === Number(form.zoneId))
  const selectedVehicle = (vehiclesQuery.data ?? []).find((v) => v.id === Number(form.vehicleId))
  const selectedSpace = (spacesQuery.data ?? []).find((s) => s.id === Number(form.assignedSpaceId))

  const createMutation = useMutation({
    mutationFn: (payload: ReservationForm) =>
      reservationsApi.create({
        userId: Number(payload.userId),
        vehicleId: Number(payload.vehicleId),
        zoneId: Number(payload.zoneId),
        assignedSpaceId: payload.assignedSpaceId ? Number(payload.assignedSpaceId) : null,
        startTime: new Date(payload.startTime).toISOString(),
        endTime: new Date(payload.endTime).toISOString(),
      }),
    onSuccess: () => {
      invalidate()
      enqueueSnackbar('Reservation created', { variant: 'success' })
      setDialogOpen(false)
      setForm({ ...defaultForm, userId: currentUser?.id ?? '' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'cancel' | 'complete' | 'delete' }) => {
      if (action === 'cancel') {
        await reservationsApi.cancel(id)
      } else if (action === 'complete') {
        await reservationsApi.complete(id)
      } else {
        await reservationsApi.remove(id)
      }
    },
    onSuccess: () => {
      invalidate()
      enqueueSnackbar('Reservation updated', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const sessionsQuery = useQuery({ queryKey: ['sessions'], queryFn: () => sessionsApi.list() })

  const reservations = reservationsQuery.data ?? []
  const sessions = sessionsQuery.data ?? []

  return (
    <Box>
      <PageHeader
        title="Reservations"
        subtitle="Bookings by zone with optional space assignment. Spaces are auto-assigned when available."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialogOpen(true)}>
            New reservation
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab value="reservations" label="Reservations" />
        <Tab value="sessions" label="Sessions" />
      </Tabs>

      {tab === 'reservations' &&
        (reservationsQuery.isLoading ? (
          <LoadingState />
        ) : reservations.length === 0 ? (
        <EmptyState
          title="No reservations"
          subtitle="Create a reservation to reserve capacity in a zone."
          action={{ label: 'New reservation', onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>Zone</TableCell>
                <TableCell>Space</TableCell>
                <TableCell>Window</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{reservation.code}</TableCell>
                  <TableCell>{reservation.userName}</TableCell>
                  <TableCell>{reservation.plateNumber}</TableCell>
                  <TableCell>{reservation.zoneName}</TableCell>
                  <TableCell>{reservation.assignedSpaceCode ?? '—'}</TableCell>
                  <TableCell>
                    {format(new Date(reservation.startTime), 'dd MMM HH:mm')} →{' '}
                    {format(new Date(reservation.endTime), 'dd MMM HH:mm')}
                  </TableCell>
                  <TableCell>
                    <StatusChip kind="reservation" value={reservation.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Complete">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => actionMutation.mutate({ id: reservation.id, action: 'complete' })}
                        disabled={!['PENDING', 'CONFIRMED', 'ACTIVE'].includes(reservation.status)}
                      >
                        <TaskAltRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => actionMutation.mutate({ id: reservation.id, action: 'cancel' })}
                        disabled={!['PENDING', 'CONFIRMED', 'ACTIVE'].includes(reservation.status)}
                      >
                        <CancelRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => actionMutation.mutate({ id: reservation.id, action: 'delete' })}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        ))}

      {tab === 'sessions' &&
        (sessionsQuery.isLoading ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            subtitle="A session is opened automatically when a space becomes occupied and closed when it is vacated."
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Space</TableCell>
                  <TableCell>Driver / vehicle</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{session.code}</TableCell>
                    <TableCell>
                      {session.spaceCode ?? '—'} · {session.zoneName}
                    </TableCell>
                    <TableCell>
                      {session.userName ?? '—'}
                      {session.plateNumber ? ` · ${session.plateNumber}` : ''}
                    </TableCell>
                    <TableCell>{format(new Date(session.checkInAt), 'dd MMM HH:mm')}</TableCell>
                    <TableCell>
                      {session.checkOutAt ? format(new Date(session.checkOutAt), 'dd MMM HH:mm') : '—'}
                    </TableCell>
                    <TableCell>
                      {session.durationMinutes != null ? `${session.durationMinutes} min` : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={session.status === 'ACTIVE' ? 'success' : 'default'}
                        label={session.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New reservation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="User"
              value={form.userId}
              onChange={(event) => setForm({ ...form, userId: Number(event.target.value) })}
              fullWidth
            >
              {(usersQuery.data ?? []).map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName} ({user.email})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Vehicle"
              value={form.vehicleId}
              onChange={(event) => setForm({ ...form, vehicleId: Number(event.target.value) })}
              fullWidth
            >
              {(vehiclesQuery.data ?? []).map((vehicle) => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.plateNumber} · {vehicle.make} {vehicle.model}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Zone"
              value={form.zoneId}
              onChange={(event) =>
                setForm({ ...form, zoneId: Number(event.target.value), assignedSpaceId: '' })
              }
              fullWidth
            >
              {(zonesQuery.data ?? []).map((zone) => (
                <MenuItem key={zone.id} value={zone.id}>
                  {zone.name} ({zone.availableSpaces} available)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Space (optional)"
              value={form.assignedSpaceId}
              onChange={(event) => setForm({ ...form, assignedSpaceId: Number(event.target.value) })}
              fullWidth
              disabled={form.zoneId === ''}
              helperText="Leave blank to auto-assign the first available space"
            >
              <MenuItem value="">Auto-assign</MenuItem>
              {(spacesQuery.data ?? []).map((space) => (
                <MenuItem key={space.id} value={space.id} disabled={space.status !== 'AVAILABLE'}>
                  {space.code ?? 'Unnamed'} · {space.status}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Start"
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                fullWidth
                error={Boolean(timeError)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: toLocalInput(new Date()) }}
              />
              <TextField
                label="End"
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                fullWidth
                error={Boolean(timeError)}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            {timeError ? (
              <Alert severity="warning" onClose={() => undefined}>
                {timeError}
              </Alert>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} hrs`}
                    </Typography>
                  </Stack>
                  {selectedVehicle ? (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Vehicle
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {selectedVehicle.plateNumber}
                      </Typography>
                    </Stack>
                  ) : null}
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Area
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedZone?.name ?? '—'}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Space
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {selectedSpace?.code ?? 'Auto-assign on arrival'}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Typography variant="caption" color="text.secondary">
                    Billing is not enabled yet, so no charge is applied for this booking.
                  </Typography>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => createMutation.mutate(form)}
            disabled={
              !form.userId ||
              !form.vehicleId ||
              !form.zoneId ||
              Boolean(timeError) ||
              createMutation.isPending
            }
          >
            {createMutation.isPending ? 'Creating…' : 'Confirm booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
