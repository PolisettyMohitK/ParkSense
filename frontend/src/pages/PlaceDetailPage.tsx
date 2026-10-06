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
          <Card sx={{ p: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Availability
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {summary.availableSpaces} of {summary.totalSpaces} free
            </Typography>
            <LinearProgress
              variant="determinate"
              value={rate}
              sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
              color={rate > 80 ? 'error' : rate > 55 ? 'warning' : 'success'}
            />
            <Typography variant="caption" color="text.secondary">
              {summary.occupiedSpaces} occupied · {summary.zoneCount} parking area(s)
            </Typography>
          </Card>
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
                    <Box>
                      <Typography fontWeight={600}>{zone.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {zone.type === 'UNSTRUCTURED' ? 'Open area' : 'Structured'}
                        {zone.floor ? ` · ${zone.floor}` : ''} · {zone.availableSpaces} free of {zone.totalSpaces}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<EventSeatRoundedIcon />}
                      onClick={() => navigate(`/reservations?zoneId=${zone.id}`)}
                      disabled={zone.availableSpaces === 0}
                    >
                      Reserve
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
