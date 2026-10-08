import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import {
  AppButton,
  Badge,
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
import { coverUrl, placesApi, reservationsApi, mySessionsApi } from '../api/endpoints'
import { queryKeys } from '../api/queryKeys'
import { useAuth } from '../store/AuthContext'
import { useUserLocation } from '../hooks/useUserLocation'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { PlaceCategory, PlaceSummary } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { availabilityTone, radius, spacing } from '../theme/palette'
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
  const cover = coverUrl(place.coverImageUrl)
  const tone = availabilityTone(colors, place.availableSpaces, place.totalSpaces)
  const isFull = place.totalSpaces > 0 && place.availableSpaces === 0

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
      <View style={styles.placeCard}>
        <View>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.cover, { backgroundColor: colors.fill }]} />
          )}
          <View style={[styles.availability, { backgroundColor: isFull ? colors.danger : colors.success }]}>
            <Text style={styles.availabilityText}>
              {isFull ? 'Full' : `${place.availableSpaces} spots`}
            </Text>
          </View>
        </View>

        <View style={styles.placeBody}>
          <Row between>
            <Text style={styles.placeName} numberOfLines={1}>
              {place.name}
            </Text>
            <Badge kind="verification" value={place.totalSpaces > 0 ? 'VERIFIED' : 'PROPOSED'} />
          </Row>
          <Text style={styles.placeMeta} numberOfLines={1}>
            {place.category ? CATEGORY_LABEL[place.category] : 'Parking'}
            {place.distanceKm != null ? ` · ${place.distanceKm.toFixed(2)} km` : ''}
            {place.hourlyRate != null && Number(place.hourlyRate) > 0
              ? ` · ₹${Number(place.hourlyRate).toFixed(0)}/hr`
              : ' · Free'}
          </Text>
          <Text style={styles.placeAddress} numberOfLines={1}>
            {[place.address, place.city].filter(Boolean).join(', ') || 'Address not set'}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${place.totalSpaces === 0 ? 0 : Math.round((place.occupiedSpaces / place.totalSpaces) * 100)}%`,
                  backgroundColor: tone,
                },
              ]}
            />
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
    },
    cover: { width: '100%', height: 160 },
    availability: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    availabilityText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    placeBody: { padding: spacing.lg, gap: 4 },
    placeName: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 },
    placeMeta: { color: colors.textSecondary, fontSize: 13 },
    placeAddress: { color: colors.textSecondary, fontSize: 12 },
    progressTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.fill,
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    progressFill: { height: 5, borderRadius: 3 },
  }),
)
