import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, Card, ChipRow, EmptyState, ListRow, ListSection, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { placesApi, reservationsApi, vehiclesApi, zonesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../store/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { spacing } from '../theme/palette'
import { formatMoney } from '../utils/format'

const STARTS = [
  { value: '0', label: 'Now' },
  { value: '30', label: 'In 30 min' },
  { value: '60', label: 'In 1 hour' },
  { value: '120', label: 'In 2 hours' },
  { value: '1440', label: 'Tomorrow' },
]

const DURATIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
]

function windowFor(startOffsetMin: number, durationMin: number) {
  const start = new Date(Date.now() + startOffsetMin * 60_000)
  if (startOffsetMin > 0) {
    // Round future starts to the next 5 minutes so the booking reads naturally.
    start.setSeconds(0, 0)
    start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5)
  }
  return { start, end: new Date(start.getTime() + durationMin * 60_000) }
}

export default function NewReservationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<RouteProp<RootStackParamList, 'NewReservation'>>()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useStyles()

  const siteIdParam = route.params?.siteId
  const spaceId = route.params?.spaceId ?? null
  const [zoneId, setZoneId] = useState<number | null>(route.params?.zoneId ?? null)
  const [vehicleId, setVehicleId] = useState<number | null>(null)
  const [startOffset, setStartOffset] = useState(spaceId ? '0' : '0')
  const [duration, setDuration] = useState('60')
  const [error, setError] = useState<string | null>(null)

  const publicZonesQuery = useQuery({
    queryKey: queryKeys.places.zones(siteIdParam ?? 0),
    queryFn: () => placesApi.zones(siteIdParam as number),
    enabled: siteIdParam != null,
  })
  const staffZonesQuery = useQuery({
    queryKey: queryKeys.zones.list(),
    queryFn: () => zonesApi.list(),
    enabled: siteIdParam == null,
  })
  const vehiclesQuery = useQuery({
    queryKey: queryKeys.vehicles.list(user?.id),
    queryFn: () => vehiclesApi.list(user?.id),
  })

  const zones = useMemo(
    () =>
      siteIdParam != null
        ? (publicZonesQuery.data ?? []).map((zone) => ({ ...zone, siteId: siteIdParam }))
        : (staffZonesQuery.data ?? []),
    [siteIdParam, publicZonesQuery.data, staffZonesQuery.data],
  )
  const vehicles = (vehiclesQuery.data ?? []).filter((vehicle) => vehicle.active)
  const activeZone = zones.find((zone) => zone.id === zoneId) ?? zones[0] ?? null
  const activeVehicleId = vehicleId ?? vehicles[0]?.id ?? null
  const siteId = siteIdParam ?? activeZone?.siteId ?? null

  const window = useMemo(() => windowFor(Number(startOffset), Number(duration)), [startOffset, duration])
  const quoteQuery = useQuery({
    queryKey: ['quote', siteId, startOffset, duration],
    queryFn: () => placesApi.quote(siteId as number, window.start.toISOString(), window.end.toISOString()),
    enabled: siteId != null,
  })

  const spacesQuery = useQuery({
    queryKey: queryKeys.places.spaces(siteId ?? 0, activeZone?.id ?? 0),
    queryFn: () => placesApi.spaces(siteId as number, activeZone!.id),
    enabled: spaceId != null && siteId != null && activeZone != null,
  })
  const chosenSpace = spacesQuery.data?.find((space) => space.id === spaceId)

  const createMutation = useMutation({
    mutationFn: () => {
      // Recompute at submit time so "Now" is really now.
      const { start, end } = windowFor(Number(startOffset), Number(duration))
      return reservationsApi.create({
        vehicleId: activeVehicleId as number,
        zoneId: activeZone!.id,
        assignedSpaceId: spaceId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      navigation.navigate('Tabs', { screen: 'Bookings' })
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (vehiclesQuery.isLoading || publicZonesQuery.isLoading || staffZonesQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  if (vehicles.length === 0) {
    return (
      <Screen>
        <Title size={28}>Reserve a spot</Title>
        <EmptyState title="Add a vehicle first" subtitle="A reservation needs a registered vehicle." icon="car-outline" />
        <AppButton label="Add vehicle" onPress={() => navigation.navigate('VehicleForm', {})} />
      </Screen>
    )
  }

  const quote = quoteQuery.data

  return (
    <Screen>
      <Title size={28}>{spaceId ? `Reserve bay ${chosenSpace?.code ?? ''}` : 'Reserve a spot'}</Title>
      <Muted>
        {spaceId
          ? 'This exact bay is held for you for the time you choose.'
          : 'Choose an area and time - a free bay is assigned automatically.'}
      </Muted>

      {spaceId == null ? (
        <ListSection title="Area">
          {zones.length === 0 ? (
            <ListRow label="No areas available" last />
          ) : (
            zones.map((zone, index) => (
              <ListRow
                key={zone.id}
                label={'siteName' in zone && zone.siteName ? `${zone.siteName} · ${zone.name}` : zone.name}
                hint={`${zone.availableSpaces} free`}
                right={activeZone?.id === zone.id ? <Text style={[styles.check, { color: colors.text }]}>✓</Text> : undefined}
                onPress={() => setZoneId(zone.id)}
                last={index === zones.length - 1}
              />
            ))
          )}
        </ListSection>
      ) : null}

      <ListSection title="Vehicle">
        <View style={styles.chipPad}>
          <ChipRow
            options={vehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.plateNumber }))}
            value={String(activeVehicleId ?? '')}
            onChange={(value) => setVehicleId(Number(value))}
          />
        </View>
      </ListSection>

      <ListSection title="Arriving">
        <View style={styles.chipPad}>
          <ChipRow options={STARTS} value={startOffset} onChange={setStartOffset} />
        </View>
      </ListSection>

      <ListSection title="Duration">
        <View style={styles.chipPad}>
          <ChipRow options={DURATIONS} value={duration} onChange={setDuration} />
        </View>
      </ListSection>

      <Card>
        <Row between>
          <Muted>
            {window.start.toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} →{' '}
            {window.end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Muted>
          {quoteQuery.isFetching ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.price}>
              {quote ? (quote.complimentary ? 'Free' : formatMoney(quote.amount)) : '—'}
            </Text>
          )}
        </Row>
        <Muted>
          {quote?.complimentary
            ? 'Complimentary parking for visitors.'
            : 'Charged per started hour. Check in within 15 minutes of the start or the booking expires.'}
        </Muted>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton
        label={createMutation.isPending ? 'Booking…' : 'Confirm reservation'}
        onPress={() => {
          setError(null)
          createMutation.mutate()
        }}
        loading={createMutation.isPending}
        disabled={!activeZone || !activeVehicleId}
      />
    </Screen>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    chipPad: { padding: spacing.lg },
    check: { fontSize: 18, fontWeight: '700' },
    error: { color: colors.danger, fontSize: 13 },
    price: { color: colors.text, fontSize: 20, fontWeight: '800' },
  }),
)
