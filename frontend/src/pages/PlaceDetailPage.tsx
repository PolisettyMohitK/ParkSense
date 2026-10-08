import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DirectionsRoundedIcon from '@mui/icons-material/DirectionsRounded'
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded'
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { PlaceDetailSkeleton } from '../components/Skeletons'
import { AMENITY_LABEL, CATEGORY_LABEL, placesApi } from '../api/places'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { PublicSpace } from '../types'
import { STATUS } from '../theme'

const HYDERABAD_CENTER = { latitude: 17.4325, longitude: 78.4072 }

export default function PlaceDetailPage() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const statusTheme = theme.palette.mode === 'dark' ? STATUS.dark : STATUS.light
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null)
  const [viewMode, setViewMode] = useState<'2.5D' | '2D'>('2.5D')

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
  const availableCount = spaces.filter((s) => s.status === 'AVAILABLE').length
  const occupiedCount = spaces.filter((s) => s.status === 'OCCUPIED').length
  const reservedCount = spaces.filter((s) => s.status === 'RESERVED').length

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
            {/* 2.5D Parking Spots Map Card */}
            <Card sx={{ p: 3, overflow: 'hidden' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Parking spots 2.5D map
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Live perspective layout for {currentZone?.name ?? 'Lot'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <ButtonGroup size="small">
                    <Button
                      variant={viewMode === '2.5D' ? 'contained' : 'outlined'}
                      startIcon={<ViewInArRoundedIcon />}
                      onClick={() => setViewMode('2.5D')}
                    >
                      2.5D Lot
                    </Button>
                    <Button
                      variant={viewMode === '2D' ? 'contained' : 'outlined'}
                      startIcon={<MapRoundedIcon />}
                      onClick={() => setViewMode('2D')}
                    >
                      2D Plan
                    </Button>
                  </ButtonGroup>
                </Stack>
              </Stack>

              {/* Zone switcher tabs if multiple zones */}
              {zones.length > 1 ? (
                <Tabs
                  value={currentZone?.id ?? false}
                  onChange={(_, val) => {
                    setActiveZoneId(val)
                    setSelectedSpace(null)
                  }}
                  variant="scrollable"
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  {zones.map((z) => (
                    <Tab key={z.id} value={z.id} label={`${z.name} (${z.availableSpaces} free)`} />
                  ))}
                </Tabs>
              ) : null}

              {/* Status Legend */}
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: statusTheme.free }} />
                  <Typography variant="caption" fontWeight={600}>
                    {availableCount} Available
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: statusTheme.occupied }} />
                  <Typography variant="caption" fontWeight={600}>
                    {occupiedCount} Occupied
                  </Typography>
                </Stack>
                {reservedCount > 0 ? (
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: statusTheme.reserved }} />
                    <Typography variant="caption" fontWeight={600}>
                      {reservedCount} Reserved
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>

              {/* 2.5D Lot Canvas */}
              <Box
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#141416' : '#23262B'),
                  borderRadius: 2,
                  p: 3,
                  overflowX: 'auto',
                  border: 1,
                  borderColor: 'divider',
                  minHeight: 280,
                  position: 'relative',
                }}
              >
                {/* Drive Aisle Strip */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    transform: 'translateY(-50%)',
                    height: 48,
                    bgcolor: 'rgba(0,0,0,0.35)',
                    borderTop: '1px dashed rgba(255,255,255,0.2)',
                    borderBottom: '1px dashed rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 2 }}>
                    ◄ DRIVE AISLE · ENTRY / EXIT ►
                  </Typography>
                </Box>

                {/* Parking Spaces Grid */}
                {spaces.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    <Typography variant="body2">No spots positioned for this zone yet.</Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))',
                      gap: 2.5,
                      position: 'relative',
                      zIndex: 1,
                      transform: viewMode === '2.5D' ? 'perspective(700px) rotateX(24deg) skewX(-4deg)' : 'none',
                      transformOrigin: 'top center',
                      transition: 'transform 0.3s ease',
                      py: 2,
                    }}
                  >
                    {spaces.map((space) => {
                      const isFree = space.status === 'AVAILABLE'
                      const isOccupied = space.status === 'OCCUPIED'
                      const isSelected = selectedSpace?.id === space.id
                      const bg = isFree ? statusTheme.free : isOccupied ? statusTheme.occupied : statusTheme.reserved
                      const edge = isFree ? '#105224' : isOccupied ? '#8C000E' : '#6F3B00'

                      return (
                        <Tooltip
                          key={space.id}
                          title={`${space.code ?? 'Space'} · ${isFree ? 'Available (Click to Select)' : space.status}`}
                          arrow
                        >
                          <Box
                            onClick={() => {
                              if (isFree) setSelectedSpace(space)
                            }}
                            sx={{
                              height: 104,
                              borderRadius: 1.5,
                              bgcolor: bg,
                              border: isSelected ? '2.5px solid #FFFFFF' : '1px solid rgba(255,255,255,0.25)',
                              boxShadow:
                                viewMode === '2.5D'
                                  ? isSelected
                                    ? `0 8px 0 ${edge}, 0 10px 16px rgba(255,255,255,0.4)`
                                    : `0 6px 0 ${edge}, 0 8px 12px rgba(0,0,0,0.5)`
                                  : 'none',
                              cursor: isFree ? 'pointer' : 'default',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1,
                              color: '#FFFFFF',
                              position: 'relative',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                              '&:hover': isFree
                                ? {
                                    transform: 'translateY(-3px)',
                                  }
                                : undefined,
                            }}
                          >
                            {/* Stall Stripe */}
                            <Box
                              sx={{
                                position: 'absolute',
                                left: 4,
                                top: 6,
                                bottom: 6,
                                width: 2,
                                bgcolor: 'rgba(255,255,255,0.3)',
                                borderRadius: 1,
                              }}
                            />
                            <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: 0.5 }}>
                              {space.code ?? `S${space.id}`}
                            </Typography>
                            <Chip
                              size="small"
                              label={isFree ? 'FREE' : isOccupied ? 'BUSY' : 'RSVD'}
                              sx={{
                                height: 16,
                                fontSize: 9,
                                fontWeight: 800,
                                bgcolor: 'rgba(0,0,0,0.3)',
                                color: '#FFFFFF',
                              }}
                            />
                          </Box>
                        </Tooltip>
                      )
                    })}
                  </Box>
                )}
              </Box>

              {/* Selection banner */}
              {selectedSpace ? (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={1.5}
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 2,
                    border: 1,
                    borderColor: 'primary.main',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Bay {selectedSpace.code} selected
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ready to reserve in {currentZone?.name}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<EventSeatRoundedIcon />}
                    onClick={() =>
                      navigate(
                        `/reservations?siteId=${siteId}&zoneId=${currentZone?.id}&spaceId=${selectedSpace.id}`
                      )
                    }
                  >
                    Reserve Bay {selectedSpace.code}
                  </Button>
                </Stack>
              ) : null}
            </Card>

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
