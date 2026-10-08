import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppButton,
  Card,
  CategoryChips,
  EmptyState,
  Loading,
  Muted,
  Row,
  Screen,
  SearchBar,
  Title,
} from '../components/ui'
import { placesApi, reservationsApi, mySessionsApi } from '../api/endpoints'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../store/AuthContext'
import { useUserLocation } from '../hooks/useUserLocation'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import PlacePhotoSlideshow from '../components/PlacePhotoSlideshow'
import type { PlaceCategory, PlaceSummary } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { radius, spacing } from '../theme/palette'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES: { value: PlaceCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'CAFE', label: 'Cafés' },
  { value: 'RESTAURANT', label: 'Restaurants' },
  { value: 'MALL', label: 'Malls' },
  { value: 'OFFICE', label: 'Offices' },
  { value: 'HOTEL', label: 'Hotels' },
  { value: 'HOSPITAL', label: 'Hospitals' },
  { value: 'EVENT_VENUE', label: 'Events' },
]

const CATEGORY_LABEL: Record<string, string> = {
  CAFE: 'Café',
  RESTAURANT: 'Restaurant',
  MALL: 'Mall',
  OFFICE: 'Office',
  HOTEL: 'Hotel',
  HOSPITAL: 'Hospital',
  EVENT_VENUE: 'Event venue',
  OTHER: 'Parking',
}

export default function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useStyles()
  const queryClient = useQueryClient()
  const location = useUserLocation()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PlaceCategory | 'ALL'>('ALL')

  const placesQuery = useQuery({
    queryKey: queryKeys.places.list({
      lat: location.latitude,
      lng: location.longitude,
      q: query.trim() || undefined,
      category: category === 'ALL' ? undefined : category,
    }),
    queryFn: () =>
      placesApi.search({
        lat: location.latitude,
        lng: location.longitude,
        q: query.trim() || undefined,
        category: category === 'ALL' ? undefined : category,
      }),
  })

  const bookingsQuery = useQuery({
    queryKey: queryKeys.reservations.all,
    queryFn: () => reservationsApi.list(),
  })
  const sessionsQuery = useQuery({
    queryKey: queryKeys.mySessions.all,
    queryFn: () => mySessionsApi.list(),
  })

  useOccupancyStream(
    () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    },
    { debounceMs: 400 }
  )

  const liveBooking = useMemo(() => {
    const session = (sessionsQuery.data ?? []).find((item) => item.status === 'ACTIVE')
    if (session) {
      return {
        id: `session-${session.id}`,
        title: `${session.spaceCode ?? 'Active session'} · ${session.zoneName}`,
        subtitle: `Checked in ${formatDistanceToNow(new Date(session.checkInAt), { addSuffix: true })}`,
      }
    }
    const reservation = (bookingsQuery.data ?? []).find((item) =>
      ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(item.status),
    )
    if (reservation) {
      return {
        id: `reservation-${reservation.id}`,
        title: `${reservation.code} · ${reservation.zoneName}`,
        subtitle: `Ends ${new Date(reservation.endTime).toLocaleString()}`,
      }
    }
    return null
  }, [bookingsQuery.data, sessionsQuery.data])

  const places = placesQuery.data ?? []

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerKicker}>Parking near</Text>
          <Text style={styles.headerTitle}>{location.label}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })} style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) ?? '?'}</Text>
        </Pressable>
      </View>

      {!location.granted && !location.loading ? (
        <Text style={styles.locationHint}>Showing distances from MG Road · enable location for accuracy</Text>
      ) : null}

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search cafés, malls, areas…" />

      {liveBooking ? (
        <Pressable onPress={() => navigation.navigate('Bookings')}>
          <Card style={styles.liveCard}>
            <Row between>
              <View style={styles.liveText}>
                <Text style={styles.liveTitle}>{liveBooking.title}</Text>
                <Text style={styles.liveSubtitle}>{liveBooking.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Row>
          </Card>
        </Pressable>
      ) : null}

      <CategoryChips options={CATEGORIES} value={category} onChange={setCategory} />

      {placesQuery.isLoading ? (
        <Loading label="Finding parking…" />
      ) : places.length === 0 ? (
        <EmptyState
          title="No places found"
          subtitle={query ? `Nothing matches “${query}”.` : 'Try a different category.'}
          icon="search-outline"
        />
      ) : (
        places.map((place) => (
          <PlaceCard
            key={place.siteId}
            place={place}
            colors={colors}
            onPress={() => navigation.navigate('PlaceDetail', { siteId: place.siteId })}
          />
        ))
      )}
    </Screen>
  )
}

function PlaceCard({
  place,
  colors,
  onPress,
}: {
  place: PlaceSummary
  colors: ReturnType<typeof useTheme>['colors']
  onPress: () => void
}) {
  const styles = useStyles()
  const isFull = place.totalSpaces > 0 && place.availableSpaces === 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.placeCard}>
        <View style={styles.coverWrapper}>
          <PlacePhotoSlideshow coverImageUrl={place.coverImageUrl} height={165} />

          {/* Minimal translucent frosted capsule for status */}
          <View style={styles.spotCapsule}>
            <Text style={styles.spotCapsuleText}>
              {isFull ? 'Occupied' : `${place.availableSpaces} spots free`}
            </Text>
          </View>
        </View>

        <View style={styles.placeBody}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.placeMeta} numberOfLines={1}>
            {place.category ? CATEGORY_LABEL[place.category] : 'Parking'}
            {place.distanceKm != null ? ` · ${place.distanceKm.toFixed(2)} km` : ''}
            {place.hourlyRate != null && Number(place.hourlyRate) > 0
              ? ` · ₹${Number(place.hourlyRate).toFixed(0)}/hr`
              : ' · Free'}
          </Text>
          <Text style={styles.placeAddress} numberOfLines={1}>
            {[place.address, place.city].filter(Boolean).join(', ') || 'Hyderabad'}
          </Text>

          <View style={styles.placeFooter}>
            <Text style={styles.placeCapacity}>{place.totalSpaces} total bays</Text>
            <Text
              style={[
                styles.placeAvailability,
                { color: isFull ? colors.textSecondary : colors.text },
              ]}
            >
              {isFull ? 'Currently full' : `${place.availableSpaces} available`}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    headerKicker: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    headerTitle: { color: colors.text, fontSize: 24, fontWeight: '700' },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.text, fontWeight: '700', fontSize: 16 },
    locationHint: { color: colors.textSecondary, fontSize: 12 },
    liveCard: { backgroundColor: colors.fill, paddingVertical: spacing.md },
    liveText: { flex: 1 },
    liveTitle: { color: colors.text, fontWeight: '600' },
    liveSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    chevron: { color: colors.textSecondary, fontSize: 22 },
    placeCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.separator,
    },
    coverWrapper: {
      width: '100%',
      height: 165,
      position: 'relative',
    },
    spotCapsule: {
      position: 'absolute',
      bottom: 10,
      left: 12,
      paddingHorizontal: 10,
      paddingVertical: 3.5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(10,12,14,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
    },
    spotCapsuleText: {
      color: '#FAFAFA',
      fontWeight: '600',
      fontSize: 11,
      letterSpacing: 0.2,
    },
    placeBody: { padding: spacing.md, gap: 3 },
    placeName: { color: colors.text, fontSize: 16, fontWeight: '700' },
    placeMeta: { color: colors.textSecondary, fontSize: 12 },
    placeAddress: { color: colors.textSecondary, fontSize: 11 },
    placeFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    placeCapacity: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    placeAvailability: {
      fontSize: 11,
      fontWeight: '600',
    },
  }),
)
