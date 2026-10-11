import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DirectionsRoundedIcon from '@mui/icons-material/DirectionsRounded'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { PlaceDetailSkeleton } from '../components/Skeletons'
import ParkingLot3DViewer from '../components/ParkingLot3DViewer'
import PlacePhotoSlideshow from '../components/PlacePhotoSlideshow'
import { AMENITY_LABEL, CATEGORY_LABEL, placesApi } from '../api/places'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import BookingDialog, { type BookingTarget } from '../components/BookingDialog'
import NotFoundPage from './NotFoundPage'
import { apiErrorMessage, apiErrorStatus } from '../api/client'
import { useUserLocation } from '../hooks/useUserLocation'
import { formatMoney, parsePositiveInt } from '../utils/format'
import type { OccupancyChangedEvent, PublicSpace } from '../types'

export default function PlaceDetailPage() {
  const params = useParams()
  const siteId = parsePositiveInt(params.siteId)
  const navigate = useNavigate()
  const location = useUserLocation()
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null)
  const [booking, setBooking] = useState<BookingTarget | null>(null)
  const coords = { lat: location.latitude, lng: location.longitude }

  const placeQuery = useQuery({
    queryKey: queryKeys.places.detail(siteId ?? 0, coords),
    queryFn: () => placesApi.get(siteId!, coords),
    enabled: siteId !== null,
    placeholderData: (previous) => previous,
  })

  const { zones = [] } = placeQuery.data ?? {}
  const currentZone = zones.find((z) => z.id === activeZoneId) ?? zones[0] ?? null

  const spacesQuery = useQuery({
    queryKey: queryKeys.places.spaces(siteId ?? 0, currentZone?.id ?? 0),
    queryFn: () => placesApi.spaces(siteId!, currentZone!.id),
    enabled: siteId !== null && currentZone != null,
  })

  // Only react to changes in this venue's areas.
  const zoneIds = new Set(zones.map((zone) => zone.id))
  useOccupancyStream(
    (event: OccupancyChangedEvent) => {
      if (!zoneIds.has(event.zoneId)) return
      placeQuery.refetch()
      if (currentZone != null && event.zoneId === currentZone.id) {
        spacesQuery.refetch()
      }
    },
    { debounceMs: 400 }
  )

  if (siteId === null || apiErrorStatus(placeQuery.error) === 404) {
    return <NotFoundPage />
  }

  if (placeQuery.isLoading) {
    return <PlaceDetailSkeleton />
  }

  if (placeQuery.isError) {
    return (
      <ErrorState
        title="Failed to load place"
        subtitle={apiErrorMessage(placeQuery.error)}
        onRetry={() => placeQuery.refetch()}
      />
    )
  }

  if (!placeQuery.data) {
    return (
      <EmptyState
        title="Place not found"
        subtitle="The requested parking place could not be found."
        action={{ label: 'Back to explore', onClick: () => navigate('/explore') }}
      />
    )
  }

  const { summary, description } = placeQuery.data
  const rate = summary.totalSpaces === 0 ? 0 : Math.round((summary.occupiedSpaces / summary.totalSpaces) * 100)
  const isPaid = summary.hourlyRate != null && Number(summary.hourlyRate) > 0
  const mapsUrl =
    summary.latitude != null && summary.longitude != null
      ? `https://www.google.com/maps?q=${summary.latitude},${summary.longitude}`
      : null

  const spaces = spacesQuery.data ?? []

  return (
    <Box>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/explore')} sx={{ mb: 1 }}>
        Back to explore
      </Button>

      <Card sx={{ overflow: 'hidden', mb: 3 }}>
        <PlacePhotoSlideshow
          photos={summary.photoUrls}
          alt={`Photos of ${summary.name}`}
          coverImageUrl={summary.coverImageUrl}
          height={{ xs: 220, md: 340 }}
          autoPlayIntervalMs={4500}
        />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700}>
              {summary.name}
            </Typography>
            {summary.category ? <Chip label={CATEGORY_LABEL[summary.category]} size="small" /> : null}
            <Chip
              label={isPaid ? `${formatMoney(Number(summary.hourlyRate))}/hr` : 'Free for visitors'}
              color={isPaid ? 'default' : 'success'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {[summary.organizationName, summary.address, summary.city].filter(Boolean).join(' · ')}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1, color: 'text.secondary' }} flexWrap="wrap" useFlexGap>
            {summary.distanceKm != null ? (
              <Typography variant="body2">
                {summary.distanceKm.toFixed(1)} km {location.precise ? 'away' : 'from city centre'}
              </Typography>
            ) : null}
            <Typography variant="body2">
              {isPaid ? `${formatMoney(Number(summary.hourlyRate))}/hr` : 'Free parking'}
            </Typography>
            {summary.openingHours ? <Typography variant="body2">{summary.openingHours}</Typography> : null}
          </Stack>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {description}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            {summary.amenities.map((amenity) => (
              <Chip key={amenity} label={AMENITY_LABEL[amenity] ?? amenity} size="small" variant="outlined" />
            ))}
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              disabled={zones.length === 0}
              onClick={() => setBooking({ siteId, zoneId: currentZone?.id ?? null })}
            >
              Reserve a bay
            </Button>
            {mapsUrl ? (
              <Button
                variant="outlined"
                startIcon={<DirectionsRoundedIcon />}
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </Button>
            ) : null}
          </Stack>
        </Box>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column: Stats & Guide */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Card sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Live availability
              </Typography>
              <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 0.5 }}>
                <Typography variant="h3" fontWeight={700} color={summary.availableSpaces === 0 ? 'error.main' : 'primary.main'}>
                  {summary.availableSpaces}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {summary.totalSpaces} free
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={rate}
                sx={{ mt: 1.5 }}
                color={rate > 80 ? 'error' : rate > 55 ? 'warning' : 'success'}
                aria-label={`${rate}% occupied`}
              />
              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Occupied
                  </Typography>
                  <Typography variant="subtitle2">{summary.occupiedSpaces}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Areas
                  </Typography>
                  <Typography variant="subtitle2">{summary.zoneCount}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Tariff
                  </Typography>
                  <Typography variant="subtitle2">
                    {isPaid ? `${formatMoney(Number(summary.hourlyRate))}/hr` : 'Free'}
                  </Typography>
                </Box>
              </Stack>
            </Card>

            <Card sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" gutterBottom>
                How parking works here
              </Typography>
              <Stack spacing={1.25}>
                {[
                  'Pick a free bay on the lot map, or let us auto-assign one.',
                  isPaid
                    ? `Choose your vehicle and time - you see the price before you book (${formatMoney(Number(summary.hourlyRate))} per started hour).`
                    : 'Choose your vehicle and time - parking here is free for visitors.',
                  'Check in from My parking when you arrive (up to 15 minutes early); check out when you leave.',
                ].map((line, index) => (
                  <Stack key={line} direction="row" spacing={1.25} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {line}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Interactive 2.5D Map & Parking Areas */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Zone Switcher Tabs if multiple zones */}
            {zones.length > 1 ? (
              <Card sx={{ p: 1.5 }}>
                <Tabs
                  value={currentZone?.id ?? false}
                  onChange={(_, val) => {
                    setActiveZoneId(val)
                    setSelectedSpace(null)
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {zones.map((z) => (
                    <Tab
                      key={z.id}
                      value={z.id}
                      label={`${z.name} (${z.availableSpaces} free)`}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Tabs>
              </Card>
            ) : null}

            {/* Interactive 3D Parking Lot Visualizer */}
            <ParkingLot3DViewer
              spaces={spaces}
              selectedSpaceId={selectedSpace?.id ?? null}
              onSelectSpace={(space) => setSelectedSpace(space)}
              onConfirm={(space) => setBooking({ siteId, zoneId: currentZone?.id ?? null, spaceId: space.id })}
              isLoading={spacesQuery.isLoading}
              zoneName={currentZone?.name ?? 'Main Lot'}
            />

            {/* Parking Areas List */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                All parking areas
              </Typography>
              {zones.length === 0 ? (
                <EmptyState title="No areas configured" subtitle="This place has no zones yet." />
              ) : (
                <Stack divider={<Divider />} spacing={0}>
                  {zones.map((zone) => (
                    <Stack
                      key={zone.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'flex-start', sm: 'center' }}
                      spacing={1}
                      sx={{ py: 1.5 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={600}>{zone.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {zone.type === 'UNSTRUCTURED' ? 'Open area' : 'Structured'}
                          {zone.floor ? ` · ${zone.floor}` : ''}
                        </Typography>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={
                              zone.totalSpaces === 0
                                ? 0
                                : ((zone.totalSpaces - zone.availableSpaces) / zone.totalSpaces) * 100
                            }
                            sx={{ maxWidth: 180, flex: 1 }}
                            color={zone.availableSpaces === 0 ? 'error' : 'success'}
                            aria-label={`${zone.availableSpaces} of ${zone.totalSpaces} free`}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {zone.availableSpaces} free of {zone.totalSpaces}
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant={currentZone?.id === zone.id ? 'outlined' : 'text'}
                          onClick={() => {
                            setActiveZoneId(zone.id)
                            setSelectedSpace(null)
                          }}
                        >
                          {currentZone?.id === zone.id ? 'Viewing lot map' : 'View map'}
                        </Button>
                        <Button
                          variant="contained"
                          disabled={zone.availableSpaces === 0}
                          onClick={() => setBooking({ siteId, zoneId: zone.id })}
                        >
                          Reserve
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Card>
          </Stack>
        </Grid>
      </Grid>
      <BookingDialog
        open={booking !== null}
        initial={booking ?? undefined}
        onClose={() => setBooking(null)}
        onBooked={() => {
          setSelectedSpace(null)
          navigate('/reservations')
        }}
      />
    </Box>
  )
}
