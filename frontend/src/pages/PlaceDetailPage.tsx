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
import { AMENITY_LABEL, CATEGORY_LABEL, placesApi } from '../api/places'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { PublicSpace } from '../types'

const HYDERABAD_CENTER = { latitude: 17.4325, longitude: 78.4072 }

export default function PlaceDetailPage() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null)

  const placeQuery = useQuery({
    queryKey: queryKeys.places.detail(Number(siteId), { lat: HYDERABAD_CENTER.latitude, lng: HYDERABAD_CENTER.longitude }),
    queryFn: () => placesApi.get(Number(siteId), { lat: HYDERABAD_CENTER.latitude, lng: HYDERABAD_CENTER.longitude }),
    enabled: Boolean(siteId),
  })

  const { zones = [] } = placeQuery.data ?? {}
  const currentZone = zones.find((z) => z.id === activeZoneId) ?? zones[0] ?? null

  const spacesQuery = useQuery({
    queryKey: ['place-spaces', siteId, currentZone?.id],
    queryFn: () => placesApi.spaces(Number(siteId), currentZone!.id),
    enabled: Boolean(siteId) && currentZone != null,
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
    return <PlaceDetailSkeleton />
  }

  if (placeQuery.isError) {
    return (
      <ErrorState
        title="Failed to load place"
        subtitle={placeQuery.error instanceof Error ? placeQuery.error.message : 'Please check your connection.'}
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
        <Box
          sx={{
            height: { xs: 200, md: 300 },
            backgroundImage: summary.coverImageUrl ? `url(${summary.coverImageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            bgcolor: 'action.hover',
          }}
        />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700}>
              {summary.name}
            </Typography>
            {summary.category ? <Chip label={CATEGORY_LABEL[summary.category]} size="small" /> : null}
            <Chip
              label={isPaid ? `₹${Number(summary.hourlyRate).toFixed(0)}/hr` : 'Free / Customer parking'}
              color={isPaid ? 'default' : 'success'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {[summary.organizationName, summary.address, summary.city].filter(Boolean).join(' · ')}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1, color: 'text.secondary' }} flexWrap="wrap" useFlexGap>
            {summary.distanceKm != null ? <Typography variant="body2">{summary.distanceKm.toFixed(2)} km away</Typography> : null}
            <Typography variant="body2">
              {isPaid ? `₹${Number(summary.hourlyRate).toFixed(0)}/hr` : 'Free parking'}
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
          {mapsUrl ? (
            <Button
              sx={{ mt: 2 }}
              variant="outlined"
              startIcon={<DirectionsRoundedIcon />}
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Directions
            </Button>
          ) : null}
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
                    {isPaid ? `₹${Number(summary.hourlyRate).toFixed(0)}/hr` : 'Free'}
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
                  isPaid ? 'Select your desired bay from the 2.5D lot map.' : 'Complimentary customer parking for patrons.',
                  'Choose your vehicle and reservation arrival time.',
                  'Automated barrier recognition verifies your entry upon arrival.',
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
              onSelectSpace={(space) => {
                setSelectedSpace(space)
                navigate(
                  `/reservations?siteId=${siteId}&zoneId=${currentZone?.id}&spaceId=${space.id}`
                )
              }}
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
                      <Button
                        variant={currentZone?.id === zone.id ? 'outlined' : 'text'}
                        onClick={() => {
                          setActiveZoneId(zone.id)
                          setSelectedSpace(null)
                        }}
                      >
                        {currentZone?.id === zone.id ? 'Viewing lot map' : 'View map'}
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
