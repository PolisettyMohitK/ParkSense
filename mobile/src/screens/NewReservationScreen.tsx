import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, ChipRow, EmptyState, ListRow, ListSection, Loading, Muted, Screen, Title } from '../components/ui'
import { placesApi, reservationsApi, vehiclesApi, zonesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { useUserLocation } from '../hooks/useUserLocation'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { spacing } from '../theme/palette'

const DURATIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '120', label: '2 hours' },
  { value: '240', label: '4 hours' },
  { value: '480', label: '8 hours' },
]

export default function NewReservationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute<RouteProp<RootStackParamList, 'NewReservation'>>()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useStyles()
  const location = useUserLocation()

  const siteId = route.params?.siteId
  const [zoneId, setZoneId] = useState<number | null>(route.params?.zoneId ?? null)
  const [vehicleId, setVehicleId] = useState<number | null>(null)
  const [duration, setDuration] = useState('60')
  const [error, setError] = useState<string | null>(null)

  const placeQuery = useQuery({
    queryKey: ['place', siteId, location.latitude, location.longitude],
    queryFn: () => placesApi.get(siteId as number, { lat: location.latitude, lng: location.longitude }),
    enabled: siteId != null,
  })
  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list(), enabled: siteId == null })
  const vehiclesQuery = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list() })

  const zones = siteId != null ? (placeQuery.data?.zones ?? []) : (zonesQuery.data ?? [])
  const vehicles = vehiclesQuery.data ?? []
  const activeZoneId = zoneId ?? zones[0]?.id ?? null
  const activeVehicleId = vehicleId ?? vehicles[0]?.id ?? null

  const createMutation = useMutation({
    mutationFn: () => {
      const start = new Date()
      const end = new Date(start.getTime() + Number(duration) * 60 * 1000)
      return reservationsApi.create({
        userId: user?.id as number,
        vehicleId: activeVehicleId as number,
        zoneId: activeZoneId as number,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['places'] })
      queryClient.invalidateQueries({ queryKey: ['place'] })
      navigation.goBack()
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (vehiclesQuery.isLoading || placeQuery.isLoading || zonesQuery.isLoading) {
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
        <EmptyState
          title="Add a vehicle first"
          subtitle="A reservation needs a registered vehicle."
          icon="car-outline"
        />
        <AppButton label="Add vehicle" onPress={() => navigation.navigate('VehicleForm', {})} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Title size={28}>{placeQuery.data?.summary.name ?? 'Reserve a spot'}</Title>
      <Muted>
        {placeQuery.data
          ? [placeQuery.data.summary.address, placeQuery.data.summary.city].filter(Boolean).join(', ')
          : 'Choose an area and how long you need it. A space is assigned automatically.'}
      </Muted>

      <ListSection title="Area">
        {zones.length === 0 ? (
          <ListRow label="No areas available" last />
        ) : (
          zones.map((zone, index) => (
            <ListRow
              key={zone.id}
              label={zone.name}
              hint={`${zone.availableSpaces} free`}
              right={
                activeZoneId === zone.id ? (
                  <Text style={[styles.check, { color: colors.text }]}>✓</Text>
                ) : undefined
              }
              onPress={() => setZoneId(zone.id)}
              last={index === zones.length - 1}
            />
          ))
        )}
      </ListSection>

      <ListSection title="Vehicle">
        <View style={styles.chipPad}>
          <ChipRow
            options={vehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.plateNumber }))}
            value={String(activeVehicleId ?? '')}
            onChange={(value) => setVehicleId(Number(value))}
          />
        </View>
      </ListSection>

      <ListSection title="Duration">
        <View style={styles.chipPad}>
          <ChipRow options={DURATIONS} value={duration} onChange={setDuration} />
        </View>
      </ListSection>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton
        label={createMutation.isPending ? 'Booking…' : 'Confirm reservation'}
        onPress={() => createMutation.mutate()}
        loading={createMutation.isPending}
        disabled={!activeZoneId || !activeVehicleId}
      />
    </Screen>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    chipPad: { padding: spacing.lg },
    check: { fontSize: 18, fontWeight: '700' },
    error: { color: colors.danger, fontSize: 13 },
  }),
)
