import { useState } from 'react'
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  AppButton,
  Badge,
  ChipRow,
  EmptyState,
  ListRow,
  ListSection,
  Loading,
  Muted,
  Pill,
  Row,
  Title,
} from '../components/ui'
import ParkingLot25DView from '../components/ParkingLot25DView'
import PlacePhotoSlideshow from '../components/PlacePhotoSlideshow'
import { coverUrl, placesApi } from '../api/endpoints'
import { queryKeys } from '../api/queryKeys'
import { useUserLocation } from '../hooks/useUserLocation'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { PublicSpace } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { availabilityTone, radius, spacing } from '../theme/palette'

const AMENITY_LABEL: Record<string, string> = {
  EV_CHARGING: 'EV charging',
  COVERED: 'Covered',
  CCTV: 'CCTV',
  VALET: 'Valet',
}

export default function PlaceDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PlaceDetail'>>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { colors } = useTheme()
  const styles = useStyles()
  const insets = useSafeAreaInsets()
  const location = useUserLocation()
  const { siteId } = route.params

  const [activeZoneId, setActiveZoneId] = useState<number | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null)

  const placeQuery = useQuery({
    queryKey: queryKeys.places.detail(siteId, { lat: location.latitude, lng: location.longitude }),
    queryFn: () => placesApi.get(siteId, { lat: location.latitude, lng: location.longitude }),
  })

  const { zones } = placeQuery.data ?? { zones: [] }
  const currentZone = zones.find((z) => z.id === activeZoneId) ?? zones[0] ?? null

  const spacesQuery = useQuery({
    queryKey: ['place-spaces', siteId, currentZone?.id],
    queryFn: () => placesApi.spaces(siteId, currentZone!.id),
    enabled: currentZone != null,
  })

  useOccupancyStream(
    () => {
      placeQuery.refetch()
      if (currentZone != null) {
        spacesQuery.refetch()
      }
    },
    { debounceMs: 400 }
  )

  if (placeQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <Loading label="Loading place…" />
      </View>
    )
  }

  if (placeQuery.isError || !placeQuery.data) {
    return (
      <View style={styles.loading}>
        <EmptyState
          title="Failed to load place"
          subtitle={placeQuery.error instanceof Error ? placeQuery.error.message : 'Please check your connection.'}
          action={{ label: 'Try again', onPress: () => placeQuery.refetch() }}
        />
      </View>
    )
  }

  const { summary } = placeQuery.data
  const tone = availabilityTone(colors, summary.availableSpaces, summary.totalSpaces)
  const isPaid = summary.hourlyRate != null && Number(summary.hourlyRate) > 0

  const openDirections = () => {
    if (summary.latitude == null || summary.longitude == null) return
    const { latitude, longitude } = summary
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(summary.name)})`,
      default: `https://www.google.com/maps?q=${latitude},${longitude}`,
    })
    if (url) Linking.openURL(url)
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ position: 'relative' }}>
          <PlacePhotoSlideshow photos={summary.photoUrls} coverImageUrl={summary.coverImageUrl} height={240} />
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.back, { top: insets.top + 8 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Row between>
            <Title size={24} style={styles.name}>
              {summary.name}
            </Title>
            {summary.category ? <Pill label={summary.category.replace('_', ' ')} /> : null}
          </Row>

          <Muted>
            {[summary.organizationName, summary.address, summary.city].filter(Boolean).join(' · ')}
          </Muted>

          {/* Pricing & Proximity Tagline */}
          <Row style={{ marginTop: 4 }}>
            <Badge kind="pricing" value={isPaid ? 'PAID' : 'FREE'} />
            <Text style={styles.meta}>
              {summary.distanceKm != null ? `${summary.distanceKm.toFixed(1)} km away  ·  ` : ''}
              {isPaid
                ? `₹${Number(summary.hourlyRate).toFixed(0)}/hr`
                : 'Free for visitors'}
            </Text>
          </Row>

          {summary.openingHours ? (
            <Row style={{ marginTop: 2 }}>
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Muted>{summary.openingHours}</Muted>
            </Row>
          ) : null}

          {/* Live Availability Bar */}
          <View style={styles.availabilityCard}>
            <Row between>
              <Text style={styles.availabilityValue}>
                {summary.availableSpaces} of {summary.totalSpaces} spots free
              </Text>
              <Text style={[styles.availabilityTone, { color: tone }]}>
                {summary.totalSpaces === 0
                  ? '—'
                  : `${Math.round((summary.availableSpaces / summary.totalSpaces) * 100)}%`}
              </Text>
            </Row>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${summary.totalSpaces === 0 ? 0 : Math.round((summary.occupiedSpaces / summary.totalSpaces) * 100)}%`,
                    backgroundColor: tone,
                  },
                ]}
              />
            </View>
          </View>

          {summary.amenities.length > 0 ? (
            <Row style={styles.amenities}>
              {summary.amenities.map((amenity) => (
                <Pill key={amenity} label={AMENITY_LABEL[amenity] ?? amenity} />
              ))}
            </Row>
          ) : null}

          {/* Interactive 2.5D Parking Spots Map Section */}
          <View style={styles.mapSectionHeader}>
            <View>
              <Title size={18}>Parking spots 2.5D map</Title>
              <Muted>Live layout & occupancy state for this venue</Muted>
            </View>
          </View>

          {/* Zone Selector Chips if multiple zones exist */}
          {zones.length > 1 ? (
            <View style={{ marginVertical: spacing.xs }}>
              <ChipRow
                options={zones.map((z) => ({
                  value: String(z.id),
                  label: `${z.name} (${z.availableSpaces} free)`,
                }))}
                value={String(currentZone?.id ?? '')}
                onChange={(val) => {
                  setActiveZoneId(Number(val))
                  setSelectedSpace(null)
                }}
              />
            </View>
          ) : null}

          {/* 2.5D Lot Map */}
          <ParkingLot25DView
            spaces={spacesQuery.data ?? []}
            selectedSpaceId={selectedSpace?.id ?? null}
            onSelectSpace={(space) => setSelectedSpace(space)}
            isLoading={spacesQuery.isLoading}
          />

          {/* Area List */}
          <ListSection title="All parking areas">
            {zones.length === 0 ? (
              <ListRow label="No areas configured" last />
            ) : (
              zones.map((zone, index) => (
                <ListRow
                  key={zone.id}
                  label={zone.name}
                  hint={`${zone.type === 'UNSTRUCTURED' ? 'Open area' : 'Structured'}${zone.floor ? ` · ${zone.floor}` : ''}`}
                  value={`${zone.availableSpaces} free`}
                  last={index === zones.length - 1}
                  onPress={() => {
                    setActiveZoneId(zone.id)
                    setSelectedSpace(null)
                  }}
                />
              ))
            )}
          </ListSection>
        </View>
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <AppButton
          label="Directions"
          variant="outline"
          icon="navigate-outline"
          style={styles.bottomHalf}
          onPress={openDirections}
        />
        <AppButton
          label={
            selectedSpace != null
              ? `Book spot ${selectedSpace.code}`
              : 'Reserve a spot'
          }
          style={styles.bottomHalf}
          onPress={() =>
            navigation.navigate('NewReservation', {
              siteId,
              zoneId: currentZone?.id,
              spaceId: selectedSpace?.id,
            })
          }
        />
      </View>
    </View>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.groupedBackground },
    loading: { flex: 1, backgroundColor: colors.groupedBackground, justifyContent: 'center' },
    scroll: { paddingBottom: 140 },
    hero: { width: '100%', height: 240 },
    back: {
      position: 'absolute',
      left: spacing.lg,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { padding: spacing.lg, gap: spacing.sm },
    name: { flex: 1 },
    meta: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
    availabilityCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.separator,
      marginTop: spacing.xs,
    },
    availabilityValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
    availabilityTone: { fontSize: 13, fontWeight: '700' },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    amenities: { flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.xs },
    mapSectionHeader: {
      marginTop: spacing.sm,
      marginBottom: 2,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
      padding: spacing.md,
      flexDirection: 'row',
      gap: spacing.md,
    },
    bottomHalf: { flex: 1 },
  }),
)
