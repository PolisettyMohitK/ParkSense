import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { AppButton, Badge, EmptyState, ListRow, ListSection, Loading, Muted, Pill, Row, Title } from '../components/ui'
import { coverUrl, placesApi } from '../api/endpoints'
import { useUserLocation } from '../hooks/useUserLocation'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
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

  const placeQuery = useQuery({
    queryKey: ['place', siteId, location.latitude, location.longitude],
    queryFn: () => placesApi.get(siteId, { lat: location.latitude, lng: location.longitude }),
  })

  useOccupancyStream(() => {
    placeQuery.refetch()
  })

  if (placeQuery.isLoading || !placeQuery.data) {
    return (
      <View style={styles.loading}>
        <Loading label="Loading place…" />
      </View>
    )
  }

  const { summary, zones } = placeQuery.data
  const cover = coverUrl(summary.coverImageUrl)
  const tone = availabilityTone(colors, summary.availableSpaces, summary.totalSpaces)

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
        <View>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.hero} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.hero, { backgroundColor: colors.fill }]} />
          )}
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
          <Row>
            {summary.distanceKm != null ? <Badge kind="verification" value="VERIFIED" /> : null}
            <Text style={styles.meta}>
              {summary.distanceKm != null ? `${summary.distanceKm.toFixed(2)} km away` : ''}
              {summary.hourlyRate != null ? `  ·  ₹${Number(summary.hourlyRate).toFixed(0)}/hr` : ''}
            </Text>
          </Row>
          {summary.openingHours ? (
            <Row>
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Muted>{summary.openingHours}</Muted>
            </Row>
          ) : null}

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

          <ListSection title="Parking areas">
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
                  onPress={() =>
                    navigation.navigate('ZoneDetail', { zoneId: zone.id, zoneName: zone.name })
                  }
                />
              ))
            )}
          </ListSection>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <AppButton
          label="Directions"
          variant="outline"
          icon="navigate-outline"
          style={styles.bottomHalf}
          onPress={openDirections}
        />
        <AppButton
          label="Reserve a spot"
          style={styles.bottomHalf}
          onPress={() => navigation.navigate('NewReservation', { siteId })}
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
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { padding: spacing.lg, gap: spacing.sm },
    name: { flex: 1 },
    meta: { color: colors.textSecondary, fontSize: 13 },
    availabilityCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      padding: spacing.lg,
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    availabilityValue: { color: colors.text, fontSize: 17, fontWeight: '700' },
    availabilityTone: { fontSize: 15, fontWeight: '700' },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.fill, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4 },
    amenities: { flexWrap: 'wrap', marginTop: spacing.xs },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    bottomHalf: { flex: 1 },
  }),
)
