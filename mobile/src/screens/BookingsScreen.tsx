import { useEffect, useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppButton,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Hairline,
  HudPanel,
  Loading,
  Mono,
  Muted,
  NumericReadout,
  Row,
  Screen,
  SectionLabel,
  SegmentedControl,
  TimelineRow,
  Title,
} from '../components/ui'
import { reservationsApi, mySessionsApi } from '../api/endpoints'
import { queryKeys } from '../api/queryKeys'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { useStayActions } from '../hooks/useStayActions'
import type { RootStackParamList } from '../navigation/types'
import type { Reservation } from '../types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { radius, spacing } from '../theme/palette'
import { formatDuration, formatMoney, formatWhen } from '../utils/format'

type Tab = 'upcoming' | 'active' | 'past'

const CHECK_IN_EARLY_MS = 15 * 60_000

function canCheckIn(reservation: Reservation, now: number) {
  return (
    reservation.status === 'CONFIRMED' &&
    now >= new Date(reservation.startTime).getTime() - CHECK_IN_EARLY_MS &&
    now < new Date(reservation.endTime).getTime()
  )
}

export default function BookingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const queryClient = useQueryClient()
  const styles = useStyles()
  const { colors } = useTheme()
  const { user } = useAuth()
  const isStaff = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const [tab, setTab] = useState<Tab>('upcoming')
  const [now, setNow] = useState(Date.now())
  const { checkIn, checkOut, openPayment, paymentSheet } = useStayActions()

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  // This tab is personal for every role: staff see their own bookings here, not everyone's.
  const reservationsQuery = useQuery({
    queryKey: queryKeys.reservations.list(user?.id),
    queryFn: () => reservationsApi.list(user?.id),
    enabled: Boolean(user),
  })
  const sessionsQuery = useQuery({
    queryKey: queryKeys.mySessions.all,
    queryFn: () => mySessionsApi.list(),
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'cancel' | 'complete' }) =>
      action === 'cancel' ? reservationsApi.cancel(id) : reservationsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.mySessions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    },
    onError: (err) => Alert.alert('Could not update booking', apiErrorMessage(err)),
  })

  const confirmCancel = (reservation: Reservation) =>
    Alert.alert(
      'Cancel booking?',
      `Bay ${reservation.assignedSpaceCode ?? ''} at ${reservation.siteName ?? reservation.zoneName} will be released.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel booking', style: 'destructive', onPress: () => actionMutation.mutate({ id: reservation.id, action: 'cancel' }) },
      ],
    )

  const reservations = useMemo(() => reservationsQuery.data ?? [], [reservationsQuery.data])
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data])

  const filtered = useMemo(() => {
    if (tab === 'active') {
      return {
        reservations: reservations.filter((item) => item.status === 'ACTIVE'),
        sessions: sessions.filter((item) => item.status === 'ACTIVE' && !item.reservationId),
      }
    }
    if (tab === 'past') {
      return {
        reservations: [] as Reservation[],
        sessions: sessions.filter((item) => item.status === 'COMPLETED'),
        missed: reservations.filter((item) => ['CANCELLED', 'EXPIRED'].includes(item.status)),
      }
    }
    return {
      reservations: reservations
        .filter((item) => ['PENDING', 'CONFIRMED'].includes(item.status))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      sessions: [],
    }
  }, [tab, reservations, sessions])

  const refetch = () => {
    reservationsQuery.refetch()
    sessionsQuery.refetch()
  }

  if (reservationsQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  if (reservationsQuery.isError || sessionsQuery.isError) {
    return (
      <Screen onRefresh={refetch}>
        <Title size={28}>Bookings</Title>
        <ErrorState message={apiErrorMessage(reservationsQuery.error ?? sessionsQuery.error)} onRetry={refetch} />
      </Screen>
    )
  }

  const missed = 'missed' in filtered ? filtered.missed ?? [] : []
  const empty = filtered.reservations.length === 0 && filtered.sessions.length === 0 && missed.length === 0

  return (
    <Screen
      floatingTabs
      onRefresh={refetch}
      refreshing={reservationsQuery.isRefetching || sessionsQuery.isRefetching}
    >
      <View>
        <Text style={styles.overline}>Driver</Text>
        <Title>My parking</Title>
      </View>
      <SegmentedControl
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'active', label: 'Parked' },
          { value: 'past', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {empty ? (
        <EmptyState
          title={tab === 'past' ? 'No history yet' : tab === 'active' ? 'Not parked right now' : 'No upcoming bookings'}
          subtitle="Reserve a spot from a place on Explore."
          icon="calendar-outline"
        />
      ) : null}

      {/* Upcoming: a vertical timeline with a "now" marker. Each booking is a
          thin row that expands into its actions. */}
      {filtered.reservations.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>{tab === 'past' ? 'Completed' : 'Upcoming & active'}</SectionLabel>
          {filtered.reservations.map((reservation, index) => (
          <TimelineRow
            key={`reservation-${reservation.id}`}
            isNow={reservation.status === 'ACTIVE'}
            last={index === filtered.reservations.length - 1}
          >
          <View style={styles.timelineRow}>
          <Row between>
            <Text style={styles.historyTitle}>{reservation.siteName ?? reservation.zoneName}</Text>
            <Badge kind="reservation" value={reservation.status} />
          </Row>
          <Mono size={11}>
            {reservation.zoneName} · bay {reservation.assignedSpaceCode ?? 'TBA'} · {reservation.plateNumber}
          </Mono>
          <Mono size={11} color={colors.textTertiary}>
            {formatWhen(reservation.startTime)} →{' '}
            {new Date(reservation.endTime).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Mono>
          <Mono size={11} color={colors.textTertiary}>
            {reservation.estimatedAmount ? `est ${formatMoney(reservation.estimatedAmount)}` : 'free'} ·{' '}
            {reservation.code}
          </Mono>
          {reservation.status === 'CONFIRMED' ? (
            <Row>
              <AppButton label="Cancel" variant="outline" style={styles.flex} onPress={() => confirmCancel(reservation)} />
              <AppButton
                label={canCheckIn(reservation, now) ? 'Check in' : 'Check-in opens soon'}
                style={styles.flex}
                disabled={!canCheckIn(reservation, now) || checkIn.isPending}
                onPress={() => checkIn.mutate(reservation.id)}
              />
            </Row>
          ) : null}
          {reservation.status === 'ACTIVE' ? (
            <Row style={{ marginTop: spacing.sm }}>
              <AppButton
                label={checkOut.isPending ? 'Checking out…' : 'Check out'}
                style={styles.flex}
                disabled={checkOut.isPending}
                onPress={() => checkOut.mutate(reservation.id)}
              />
              {isStaff ? (
                <AppButton
                  label="Complete"
                  variant="tinted"
                  style={styles.flex}
                  onPress={() => actionMutation.mutate({ id: reservation.id, action: 'complete' })}
                />
              ) : null}
            </Row>
          ) : null}
          </View>
          </TimelineRow>
        ))}
        </View>
      ) : null}

      {/* History: thin rows with mono receipt refs, not a wall of cards. */}
      {filtered.sessions.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>History &amp; receipts</SectionLabel>
          {filtered.sessions.map((session, index) => (
            <View key={`session-${session.id}`} style={styles.historyRow}>
              <Hairline />
              <Row between>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.historyTitle}>{session.siteName ?? session.zoneName}</Text>
                  <Mono size={11}>
                    bay {session.spaceCode ?? '—'} · {session.plateNumber ?? 'vehicle'} ·{' '}
                    {formatWhen(session.checkInAt)}
                  </Mono>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Mono size={12} color={colors.text}>
                    {session.hourlyRate ? formatMoney(session.amount) : 'Free'}
                  </Mono>
                  {session.paymentStatus ? <Badge kind="payment" value={session.paymentStatus} /> : null}
                </View>
              </Row>
              {session.paymentRef ? (
                <Mono size={10} color={colors.textTertiary}>
                  ref {session.paymentRef}
                </Mono>
              ) : null}
              {session.paymentStatus === 'PENDING' ? (
                <AppButton
                  label={`Pay ${formatMoney(session.amount)}`}
                  onPress={() => openPayment(session)}
                  style={{ marginTop: spacing.sm }}
                />
              ) : null}
              {index === filtered.sessions.length - 1 ? <Hairline /> : null}
            </View>
          ))}
        </View>
      ) : null}

      {missed.map((reservation) => (
        <Card key={`missed-${reservation.id}`}>
          <Row between>
            <Title size={16}>{reservation.siteName ?? reservation.zoneName}</Title>
            <Badge kind="reservation" value={reservation.status} />
          </Row>
          <Muted>{formatWhen(reservation.startTime)} · {reservation.code}</Muted>
        </Card>
      ))}

      <AppButton
        label="Explore parking"
        variant="tinted"
        onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })}
      />
      {paymentSheet}
    </Screen>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    overline: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    price: { color: colors.text, fontWeight: '600' },
    historyRow: { gap: spacing.sm, paddingVertical: spacing.sm },
    historyTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
    timelineRow: {
      gap: 2,
      padding: spacing.md,
      borderRadius: radius.control,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
    },
  }),
)
