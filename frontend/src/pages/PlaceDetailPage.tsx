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
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DirectionsRoundedIcon from '@mui/icons-material/DirectionsRounded'
import EventSeatRoundedIcon from '@mui/icons-material/EventSeatRounded'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import { AMENITY_LABEL, CATEGORY_LABEL, placesApi } from '../api/places'
import { useOccupancyStream } from '../hooks/useOccupancyStream'

const MG_ROAD = { latitude: 12.9756, longitude: 77.6053 }

export default function PlaceDetailPage() {
  const { siteId } = useParams()
  const navigate = useNavigate()

  const placeQuery = useQuery({
    queryKey: ['place', siteId],
    queryFn: () => placesApi.get(Number(siteId), { lat: MG_ROAD.latitude, lng: MG_ROAD.longitude }),
    enabled: Boolean(siteId),
  })

  useOccupancyStream(() => {
    placeQuery.refetch()
  })

  if (placeQuery.isLoading || !placeQuery.data) {
    return <LoadingState minHeight={420} />
  }

  const { summary, zones, description } = placeQuery.data
  const rate = summary.totalSpaces === 0 ? 0 : Math.round((summary.occupiedSpaces / summary.totalSpaces) * 100)
  const mapsUrl =
    summary.latitude != null && summary.longitude != null
      ? `https://www.google.com/maps?q=${summary.latitude},${summary.longitude}`
      : null

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
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {[summary.organizationName, summary.address, summary.city].filter(Boolean).join(' · ')}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1, color: 'text.secondary' }} flexWrap="wrap" useFlexGap>
            {summary.distanceKm != null ? <Typography variant="body2">{summary.distanceKm.toFixed(2)} km away</Typography> : null}
            {summary.hourlyRate != null ? <Typography variant="body2">₹{Number(summary.hourlyRate).toFixed(0)}/hr</Typography> : null}
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
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Card sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Availability now
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
                    Rate
                  </Typography>
                  <Typography variant="subtitle2">
                    {summary.hourlyRate != null ? `₹${Number(summary.hourlyRate).toFixed(0)}/hr` : '—'}
                  </Typography>
                </Box>
              </Stack>
            </Card>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" gutterBottom>
                How booking works
              </Typography>
              <Stack spacing={1.25}>
                {[
                  'Pick a parking area with free spots.',
                  'Choose your vehicle and a time window.',
                  'Arrive and scan — the gate logs your entry.',
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

        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Parking areas
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
                      variant="contained"
                      startIcon={<EventSeatRoundedIcon />}
                      onClick={() => navigate(`/reservations?zoneId=${zone.id}`)}
                      disabled={zone.availableSpaces === 0}
                    >
                      {zone.availableSpaces === 0 ? 'Full' : 'Reserve'}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
