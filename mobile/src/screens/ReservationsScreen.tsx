import { StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, Badge, Card, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { reservationsApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { useState } from 'react'

export default function ReservationsScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const reservationsQuery = useQuery({ queryKey: ['reservations'], queryFn: () => reservationsApi.list() })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'cancel' | 'complete' }) =>
      action === 'cancel' ? reservationsApi.cancel(id) : reservationsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (reservationsQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const reservations = reservationsQuery.data ?? []

  return (
    <Screen>
      <Title size={24}>My reservations</Title>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {reservations.length === 0 ? (
        <EmptyState title="No reservations" subtitle="Book a zone from the Home tab." />
      ) : (
        reservations.map((reservation) => {
          const active = ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(reservation.status)
          return (
            <Card key={reservation.id}>
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
                {new Date(reservation.endTime).toLocaleString()}
              </Muted>
              <Muted>Vehicle {reservation.plateNumber}</Muted>
              {active ? (
                <Row>
                  <AppButton
                    label="Cancel"
                    variant="outline"
                    style={styles.flex}
                    onPress={() => actionMutation.mutate({ id: reservation.id, action: 'cancel' })}
                  />
                  <AppButton
                    label="Complete"
                    variant="success"
                    style={styles.flex}
                    onPress={() => actionMutation.mutate({ id: reservation.id, action: 'complete' })}
                  />
                </Row>
              ) : null}
            </Card>
          )
        })
      )}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  flex: { flex: 1 },
  error: { color: colors.danger, fontSize: 13 },
}))
