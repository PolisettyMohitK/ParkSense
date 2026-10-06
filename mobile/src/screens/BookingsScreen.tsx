import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, Badge, Card, EmptyState, Loading, Muted, Row, Screen, SegmentedControl, Title } from '../components/ui'
import { reservationsApi, sessionsApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { spacing } from '../theme/palette'

type Tab = 'upcoming' | 'active' | 'past'

export default function BookingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const styles = useStyles()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [error, setError] = useState<string | null>(null)

  const reservationsQuery = useQuery({ queryKey: ['reservations'], queryFn: () => reservationsApi.list() })
  const sessionsQuery = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => sessionsApi.list() })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'cancel' | 'complete' }) =>
      action === 'cancel' ? reservationsApi.cancel(id) : reservationsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['places'] })
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const reservations = reservationsQuery.data ?? []
  const sessions = sessionsQuery.data ?? []

  const filtered = useMemo(() => {
    if (tab === 'active') {
      return {
        reservations: reservations.filter((item) => item.status === 'ACTIVE'),
        sessions: sessions.filter((item) => item.status === 'ACTIVE'),
      }
    }
    if (tab === 'past') {
      return {
        reservations: reservations.filter((item) =>
          ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(item.status),
        ),
        sessions: sessions.filter((item) => item.status === 'COMPLETED'),
      }
    }
    return {
      reservations: reservations.filter((item) => ['PENDING', 'CONFIRMED'].includes(item.status)),
      sessions: [],
    }
  }, [tab, reservations, sessions])

  const empty = filtered.reservations.length === 0 && filtered.sessions.length === 0

  if (reservationsQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  return (
    <Screen>
      <Title size={28}>Bookings</Title>
      <SegmentedControl
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'active', label: 'Active' },
          { value: 'past', label: 'Past' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {empty ? (
        <EmptyState
          title={tab === 'past' ? 'No past bookings' : 'Nothing here yet'}
          subtitle="Reserve a spot from a place on Explore."
          icon="calendar-outline"
        />
      ) : null}

      {filtered.sessions.map((session) => (
        <Card key={`session-${session.id}`}>
          <Row between>
            <Title size={16}>{session.spaceCode ?? session.code}</Title>
            <Badge kind="reservation" value="ACTIVE" />
          </Row>
          <Muted>{session.zoneName}</Muted>
          <Muted>Checked in {new Date(session.checkInAt).toLocaleString()}</Muted>
          {session.durationMinutes != null ? (
            <Text style={styles.duration}>{session.durationMinutes} min</Text>
          ) : (
            <Text style={styles.duration}>In progress</Text>
          )}
        </Card>
      ))}

      {filtered.reservations.map((reservation) => (
        <Card key={`reservation-${reservation.id}`}>
          <Row between>
            <Title size={16}>{reservation.code}</Title>
            <Badge kind="reservation" value={reservation.status} />
          </Row>
          <Muted>
            {reservation.zoneName}
            {reservation.assignedSpaceCode ? ` · space ${reservation.assignedSpaceCode}` : ''}
          </Muted>
          <Muted>
            {new Date(reservation.startTime).toLocaleString()} →{' '}
            {new Date(reservation.endTime).toLocaleTimeString()}
          </Muted>
          {['PENDING', 'CONFIRMED', 'ACTIVE'].includes(reservation.status) ? (
            <Row>
              <AppButton
                label="Cancel"
                variant="outline"
                style={styles.flex}
                onPress={() => actionMutation.mutate({ id: reservation.id, action: 'cancel' })}
              />
              <AppButton
                label="Complete"
                variant="tinted"
                style={styles.flex}
                onPress={() => actionMutation.mutate({ id: reservation.id, action: 'complete' })}
              />
            </Row>
          ) : null}
        </Card>
      ))}

      <AppButton
        label="Explore parking"
        variant="tinted"
        onPress={() => navigation.navigate('Tabs', { screen: 'Explore' })}
      />
    </Screen>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    duration: { color: colors.text, fontWeight: '700' },
    error: { color: colors.danger, fontSize: 13 },
  }),
)
