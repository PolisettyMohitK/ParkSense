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
  ErrorState,
  Loading,
  Muted,
  NumericReadout,
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
import { apiErrorMessage } from '../api/client'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatMoney } from '../utils/format'

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
  const search = useDebouncedValue(query.trim(), 300)

  const placesQuery = useQuery({
    queryKey: queryKeys.places.list({
      lat: location.latitude,
      lng: location.longitude,
      q: search || undefined,
      category: category === 'ALL' ? undefined : category,
    }),
    queryFn: () =>
      placesApi.search({
        lat: location.latitude,
        lng: location.longitude,
        q: search || undefined,
        category: category === 'ALL' ? undefined : category,
      }),
    placeholderData: (previous) => previous,
  })

  // Only the signed-in user's own bookings - staff accounts would otherwise see everyone's.
  const bookingsQuery = useQuery({
    queryKey: queryKeys.reservations.list(user?.id),
    queryFn: () => reservationsApi.list(user?.id),
    enabled: Boolean(user),
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
        title: `Parked at ${session.siteName ?? session.zoneName} · bay ${session.spaceCode ?? '—'}`,
        subtitle: `Checked in ${formatDistanceToNow(new Date(session.checkInAt), { addSuffix: true })}${
          session.hourlyRate ? ` · ${formatMoney(session.amount)} so far` : ''
        }`,
      }
    }
    const reservation = (bookingsQuery.data ?? [])
      .filter((item) => ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(item.status))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
    if (reservation) {
      return {
        id: `reservation-${reservation.id}`,
        title: `Next: ${reservation.siteName ?? reservation.zoneName} · bay ${reservation.assignedSpaceCode ?? 'TBA'}`,
        subtitle: `Starts ${formatDistanceToNow(new Date(reservation.startTime), { addSuffix: true })} · tap to check in`,
      }
    }
    return null
  }, [bookingsQuery.data, sessionsQuery.data])

  const places = placesQuery.data ?? []

  return (
    <Screen
      onRefresh={() => {
        placesQuery.refetch()
        bookingsQuery.refetch()
        sessionsQuery.refetch()
      }}
      refreshing={placesQuery.isRefetching}
      floatingTabs
    >
      {/* Hero: one line of copy, one live instrument number, one search field. */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.headerKicker}>Parking near you</Text>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{location.label}</Text>
            <View style={styles.freeReadout}>
              <NumericReadout
                value={places.reduce((total, place) => total + place.availableSpaces, 0)}
                size={15}
                color={colors.holo}
              />
              <Text style={styles.freeSuffix}>bays free</Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
        >
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) ?? '?'}</Text>
        </Pressable>
      </View>

      {!location.granted && !location.loading ? (
        <Text style={styles.locationHint}>Showing distances from Jubilee Hills · enable location for accuracy</Text>
      ) : null}

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search cafés, malls, areas…" />

      {liveBooking ? (
        <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Bookings' })}>
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
      ) : placesQuery.isError ? (
        <ErrorState message={apiErrorMessage(placesQuery.error)} onRetry={() => placesQuery.refetch()} />
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
          <PlacePhotoSlideshow photos={place.photoUrls} coverImageUrl={place.coverImageUrl} height={165} autoPlay={false} />

          {/* Status capsule: coloured dot + free count, never colour alone. */}
          <View style={styles.spotCapsule}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: isFull ? colors.danger : colors.success,
              }}
            />
            <Text style={styles.spotCapsuleText}>
              {isFull ? 'Full' : `${place.availableSpaces} free`}
            </Text>
          </View>
        </View>

        <View style={styles.placeBody}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.placeMeta} numberOfLines={1}>
            {place.category ? CATEGORY_LABEL[place.category] : 'Parking'}
            {place.distanceKm != null ? ` · ${place.distanceKm.toFixed(1)} km` : ''}
            {place.hourlyRate != null && Number(place.hourlyRate) > 0
              ? ` · ${formatMoney(Number(place.hourlyRate))}/hr`
              : ' · Free'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    headerKicker: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    headerTitle: { color: colors.text, fontSize: 26, lineHeight: 30, fontWeight: '600', letterSpacing: -0.5 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
    freeReadout: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
    freeSuffix: { color: colors.holo, fontSize: 13 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairlineStrong,
    },
    avatarText: { color: colors.text, fontWeight: '600', fontSize: 14 },
    locationHint: { color: colors.textSecondary, fontSize: 12 },
    liveCard: {
      backgroundColor: colors.glass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairlineStrong,
      borderRadius: radius.panel,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    liveText: { flex: 1 },
    liveTitle: { color: colors.text, fontWeight: '600' },
    liveSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    chevron: { color: colors.textSecondary, fontSize: 22 },
    placeCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.panel,
      overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
    },
    coverWrapper: {
      width: '100%',
      aspectRatio: 16 / 10,
      position: 'relative',
    },
    spotCapsule: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.glass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairlineStrong,
    },
    spotCapsuleText: {
      color: colors.text,
      fontWeight: '500',
      fontSize: 12,
    },
    placeBody: { padding: spacing.lg, gap: 4 },
    placeName: { color: colors.text, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
    placeMeta: { color: colors.textSecondary, fontSize: 13 },
  }),
)
