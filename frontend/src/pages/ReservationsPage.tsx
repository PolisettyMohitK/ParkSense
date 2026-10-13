import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import { useSnackbar } from 'notistack'
import { format } from 'date-fns'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import StatusChip from '../components/StatusChip'
import BookingDialog, { type BookingTarget } from '../components/BookingDialog'
import ActiveStayCard from '../components/ActiveStayCard'
import PaymentDialog from '../components/PaymentDialog'
import { reservationsApi } from '../api/reservations'
import { mySessionsApi, sessionsApi } from '../api/sessions'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAppSelector } from '../store/hooks'
import { useConfirm } from '../hooks/useConfirm'
import { useStayActions } from '../hooks/useStayActions'
import { formatDuration, formatMoney, parsePositiveInt } from '../utils/format'
import type { MySession, ParkingSession, PaymentMethod, Reservation } from '../types'

const OPEN_STATUSES = ['PENDING', 'CONFIRMED', 'ACTIVE']
const CHECK_IN_EARLY_MS = 15 * 60_000

function canCheckIn(reservation: Reservation, now = Date.now()) {
  return (
    reservation.status === 'CONFIRMED' &&
    now >= new Date(reservation.startTime).getTime() - CHECK_IN_EARLY_MS &&
    now < new Date(reservation.endTime).getTime()
  )
}

function windowLabel(reservation: Reservation) {
  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)
  const sameDay = start.toDateString() === end.toDateString()
  return `${format(start, 'EEE dd MMM, HH:mm')} – ${format(end, sameDay ? 'HH:mm' : 'dd MMM HH:mm')}`
}

export default function ReservationsPage() {
  const currentUser = useAppSelector((state) => state.auth.user)
  const isDriver = currentUser?.role === 'USER'
  const [tab, setTab] = useState<'reservations' | 'sessions'>('reservations')
  const [bookingTarget, setBookingTarget] = useState<BookingTarget | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Deep link from a place page: /reservations?siteId=..&zoneId=..&spaceId=..
  useEffect(() => {
    const siteId = parsePositiveInt(searchParams.get('siteId'))
    const zoneId = parsePositiveInt(searchParams.get('zoneId'))
    const spaceId = parsePositiveInt(searchParams.get('spaceId'))
    if (siteId || zoneId) {
      setBookingTarget({ siteId, zoneId, spaceId })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <div>
      <PageHeader
        overline={isDriver ? undefined : 'Operations'}
        title={isDriver ? 'My parking' : 'Reservations'}
        subtitle={
          isDriver
            ? 'Upcoming bookings, check-in and check-out, and your parking history.'
            : 'All bookings and parking sessions across venues.'
        }
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setBookingTarget({})}>
            Book parking
          </Button>
        }
      />

      {isDriver && <ActiveStayCard />}

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab value="reservations" label="Bookings" />
        <Tab value="sessions" label={isDriver ? 'History & payments' : 'Sessions'} />
      </Tabs>

      {tab === 'reservations' &&
        (isDriver ? (
          <DriverBookings onBook={() => setBookingTarget({})} />
        ) : (
          <StaffReservations onBook={() => setBookingTarget({})} />
        ))}
      {tab === 'sessions' && (isDriver ? <DriverHistory /> : <StaffSessions />)}

      <BookingDialog
        open={bookingTarget !== null}
        initial={bookingTarget ?? undefined}
        onClose={() => setBookingTarget(null)}
        onBooked={() => setTab('reservations')}
      />
    </div>
  )
}

function DriverBookings({ onBook }: { onBook: () => void }) {
  const navigate = useNavigate()
  const query = useQuery({ queryKey: queryKeys.reservations.list(), queryFn: () => reservationsApi.list() })
  const { checkIn, checkOut, paymentDialog } = useStayActions()
  const cancel = useCancel()
  const [confirm, confirmDialog] = useConfirm()
  const [now, setNow] = useState(Date.now())

  // Re-evaluate check-in eligibility as time passes.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const { upcoming, past } = useMemo(() => {
    const all = [...(query.data ?? [])].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    )
    return {
      upcoming: all.filter((r) => OPEN_STATUSES.includes(r.status)).reverse(),
      past: all.filter((r) => !OPEN_STATUSES.includes(r.status)),
    }
  }, [query.data])

  if (query.isLoading) return <LoadingState />
  if (query.isError)
    return <ErrorState subtitle={apiErrorMessage(query.error)} onRetry={() => query.refetch()} />
  if ((query.data ?? []).length === 0)
    return (
      <EmptyState
        icon={<EventAvailableRoundedIcon sx={{ fontSize: 48 }} />}
        title="No bookings yet"
        subtitle="Find a place nearby and reserve a bay in a few taps."
        action={{ label: 'Explore places', onClick: () => navigate('/explore') }}
      />
    )

  const renderCard = (reservation: Reservation) => (
    <Grid item xs={12} md={6} key={reservation.id}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <ReservationIdentity reservation={reservation} />
              <StatusChip kind="reservation" value={reservation.status} />
            </Stack>
            <Typography variant="body2">{windowLabel(reservation)}</Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {reservation.code} ·{' '}
                {reservation.estimatedAmount ? `est. ${formatMoney(reservation.estimatedAmount)}` : 'Free'}
              </Typography>
              <Stack direction="row" spacing={1}>
                {reservation.status === 'CONFIRMED' && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Cancel booking?',
                          message: `Bay ${reservation.assignedSpaceCode ?? ''} at ${reservation.siteName ?? reservation.zoneName} will be released.`,
                          confirmLabel: 'Cancel booking',
                        })
                      ) {
                        cancel.mutate(reservation.id)
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {reservation.status === 'CONFIRMED' && (
                  <Tooltip
                    title={canCheckIn(reservation, now) ? '' : 'Check-in opens 15 minutes before your slot'}
                  >
                    <span>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<LoginRoundedIcon />}
                        disabled={!canCheckIn(reservation, now) || checkIn.isPending}
                        onClick={() => checkIn.mutate(reservation.id)}
                      >
                        Check in
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {reservation.status === 'ACTIVE' && (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<LogoutRoundedIcon />}
                    disabled={checkOut.isPending}
                    onClick={() => checkOut.mutate(reservation.id)}
                  >
                    Check out
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  )

  return (
    <Stack spacing={3}>
      <SectionBlock label="Upcoming & active" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing upcoming" subtitle="Your next booking will appear here." action={{ label: 'Book parking', onClick: onBook }} />
        ) : (
          <Grid container spacing={2}>
            {upcoming.map(renderCard)}
          </Grid>
        )}
      </SectionBlock>
      {past.length > 0 ? (
        <SectionBlock label="Past" count={past.length}>
          <Grid container spacing={2}>
            {past.map(renderCard)}
          </Grid>
        </SectionBlock>
      ) : null}
      {confirmDialog}
      {paymentDialog}
    </Stack>
  )
}

function DriverHistory() {
  const query = useQuery({ queryKey: queryKeys.mySessions.all, queryFn: mySessionsApi.list })
  const { openPayment, paymentDialog } = useStayActions()

  if (query.isLoading) return <LoadingState />
  if (query.isError)
    return <ErrorState subtitle={apiErrorMessage(query.error)} onRetry={() => query.refetch()} />
  const stays = query.data ?? []
  if (stays.length === 0)
    return <EmptyState title="No parking history yet" subtitle="Your completed stays and receipts will appear here." />

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Place</TableCell>
              <TableCell>Check-in</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {stays.map((stay: MySession) => (
              <TableRow key={stay.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {stay.siteName ?? stay.zoneName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bay {stay.spaceCode ?? '—'} · {stay.plateNumber ?? '—'} · {stay.code}
                  </Typography>
                </TableCell>
                <TableCell>{format(new Date(stay.checkInAt), 'dd MMM, HH:mm')}</TableCell>
                <TableCell>
                  {stay.status === 'ACTIVE' ? <StatusChip kind="session" value="ACTIVE" /> : formatDuration(stay.durationMinutes)}
                </TableCell>
                <TableCell align="right">{stay.hourlyRate ? formatMoney(stay.amount) : 'Free'}</TableCell>
                <TableCell>
                  {stay.paymentStatus ? (
                    <Tooltip title={stay.paymentRef ? `Ref ${stay.paymentRef} · ${stay.paymentMethod}` : ''}>
                      <span>
                        <StatusChip kind="payment" value={stay.paymentStatus} />
                      </span>
                    </Tooltip>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell align="right">
                  {stay.paymentStatus === 'PENDING' && (
                    <Button size="small" variant="contained" startIcon={<PaymentsRoundedIcon />} onClick={() => openPayment(stay)}>
                      Pay
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {paymentDialog}
    </>
  )
}

function useCancel() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  return useMutation({
    mutationFn: (id: number) => reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      enqueueSnackbar('Booking cancelled', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })
}

function StaffReservations({ onBook }: { onBook: () => void }) {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [confirm, confirmDialog] = useConfirm()
  const query = useQuery({ queryKey: queryKeys.reservations.list(), queryFn: () => reservationsApi.list() })

  const action = useMutation({
    mutationFn: async ({ id, kind }: { id: number; kind: 'cancel' | 'complete' | 'delete' }) => {
      if (kind === 'cancel') await reservationsApi.cancel(id)
      else if (kind === 'complete') await reservationsApi.complete(id)
      else await reservationsApi.remove(id)
    },
    onSuccess: (_, { kind }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      enqueueSnackbar(kind === 'delete' ? 'Reservation deleted' : `Reservation ${kind === 'cancel' ? 'cancelled' : 'completed'}`, {
        variant: 'success',
      })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const ask = async (reservation: Reservation, kind: 'cancel' | 'complete' | 'delete') => {
    const copy = {
      cancel: { title: 'Cancel reservation?', label: 'Cancel reservation', message: `${reservation.code} for ${reservation.userName} will be cancelled and its bay released.` },
      complete: { title: 'Complete reservation?', label: 'Complete', message: `${reservation.code} will be closed. If the car is still parked, its stay is checked out and priced now.` },
      delete: { title: 'Delete reservation?', label: 'Delete', message: `${reservation.code} will be permanently removed. This cannot be undone.` },
    }[kind]
    if (await confirm({ title: copy.title, message: copy.message, confirmLabel: copy.label })) {
      action.mutate({ id: reservation.id, kind })
    }
  }

  if (query.isLoading) return <LoadingState />
  if (query.isError)
    return <ErrorState subtitle={apiErrorMessage(query.error)} onRetry={() => query.refetch()} />
  const reservations = query.data ?? []
  if (reservations.length === 0)
    return (
      <EmptyState
        title="No reservations"
        subtitle="Bookings made by drivers, or on their behalf, appear here."
        action={{ label: 'Book parking', onClick: onBook }}
      />
    )

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Driver</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Place / bay</TableCell>
              <TableCell>Window</TableCell>
              <TableCell align="right">Est.</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reservations.map((reservation) => {
              const open = OPEN_STATUSES.includes(reservation.status)
              return (
                <TableRow key={reservation.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{reservation.code}</TableCell>
                  <TableCell>{reservation.userName}</TableCell>
                  <TableCell>{reservation.plateNumber}</TableCell>
                  <TableCell>
                    {reservation.siteName ?? '—'}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {reservation.zoneName} · {reservation.assignedSpaceCode ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{windowLabel(reservation)}</TableCell>
                  <TableCell align="right">
                    {reservation.estimatedAmount ? formatMoney(reservation.estimatedAmount) : 'Free'}
                  </TableCell>
                  <TableCell>
                    <StatusChip kind="reservation" value={reservation.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Complete">
                      <span>
                        <IconButton size="small" color="success" disabled={!open} onClick={() => ask(reservation, 'complete')}>
                          <TaskAltRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <span>
                        <IconButton
                          size="small"
                          color="warning"
                          disabled={!open || reservation.status === 'ACTIVE'}
                          onClick={() => ask(reservation, 'cancel')}
                        >
                          <CancelRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={reservation.status === 'ACTIVE'}
                          onClick={() => ask(reservation, 'delete')}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {confirmDialog}
    </>
  )
}

function StaffSessions() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [collectFor, setCollectFor] = useState<ParkingSession | null>(null)
  const query = useQuery({ queryKey: queryKeys.sessions.list(), queryFn: () => sessionsApi.list() })

  const collect = useMutation({
    mutationFn: ({ id, method }: { id: number; method: PaymentMethod }) => sessionsApi.recordPayment(id, method),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
      setCollectFor(null)
      enqueueSnackbar(`Payment recorded · ${session.paymentRef}`, { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  if (query.isLoading) return <LoadingState />
  if (query.isError)
    return <ErrorState subtitle={apiErrorMessage(query.error)} onRetry={() => query.refetch()} />
  const sessions = query.data ?? []
  if (sessions.length === 0)
    return (
      <EmptyState
        title="No sessions yet"
        subtitle="A session opens when a space becomes occupied and closes when it is vacated."
      />
    )

  return (
    <>
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
              <TableCell align="right">Amount</TableCell>
              <TableCell>Payment</TableCell>
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
                  {session.userName ?? 'Walk-in'}
                  {session.plateNumber ? ` · ${session.plateNumber}` : ''}
                </TableCell>
                <TableCell>{format(new Date(session.checkInAt), 'dd MMM HH:mm')}</TableCell>
                <TableCell>{session.checkOutAt ? format(new Date(session.checkOutAt), 'dd MMM HH:mm') : '—'}</TableCell>
                <TableCell>
                  {session.status === 'ACTIVE' ? (
                    <StatusChip kind="session" value="ACTIVE" />
                  ) : (
                    formatDuration(session.durationMinutes)
                  )}
                </TableCell>
                <TableCell align="right">{session.amount != null ? formatMoney(session.amount) : '—'}</TableCell>
                <TableCell>
                  {session.paymentStatus === 'PENDING' ? (
                    <Button size="small" variant="outlined" onClick={() => setCollectFor(session)}>
                      Record payment
                    </Button>
                  ) : session.paymentStatus ? (
                    <StatusChip kind="payment" value={session.paymentStatus} />
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <PaymentDialog
        open={collectFor !== null}
        title="Record payment"
        amount={collectFor?.amount}
        description={collectFor ? `${collectFor.code} · ${collectFor.zoneName} · ${collectFor.spaceCode ?? ''}` : undefined}
        durationMinutes={collectFor?.durationMinutes}
        loading={collect.isPending}
        onPay={(method) => collectFor && collect.mutate({ id: collectFor.id, method })}
        onClose={() => setCollectFor(null)}
      />
    </>
  )
}

/** Overline + mono count, with no card. Separation is hairlines, not boxes. */
function SectionBlock({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div style={sectionHead}>
        <span style={sectionLabel}>{label}</span>
        <span style={sectionCount}>{count}</span>
      </div>
      {children}
    </section>
  )
}

function ReservationIdentity({ reservation }: { reservation: Reservation }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {reservation.siteName ?? reservation.zoneName}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.47, color: 'var(--color-text-secondary)' }}>
        {reservation.zoneName} · bay{' '}
        <span style={{ fontFamily: 'var(--font-mono)' }}>{reservation.assignedSpaceCode ?? 'TBA'}</span> ·{' '}
        <span style={{ fontFamily: 'var(--font-mono)' }}>{reservation.plateNumber}</span>
      </div>
    </div>
  )
}

const sectionHead: import('react').CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 12,
}

const sectionLabel: import('react').CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

const sectionCount: import('react').CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--color-text-tertiary)',
}
