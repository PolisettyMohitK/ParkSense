import { useDeferredValue, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Grid,
  InputAdornment,
  LinearProgress,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { placesApi, CATEGORY_LABEL } from '../api/places'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import { useAppSelector } from '../store/hooks'
import type { PlaceCategory } from '../types'

const HYDERABAD_CENTER = { latitude: 17.4325, longitude: 78.4072 }

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

const SORT_OPTIONS = [
  { value: 'DISTANCE', label: 'Nearest' },
  { value: 'AVAILABILITY', label: 'Most free' },
  { value: 'RATE', label: 'Cheapest' },
] as const

type Sort = (typeof SORT_OPTIONS)[number]['value']

/** Card-shaped skeletons so the grid does not jump when results arrive. */
function PlaceCardSkeleton() {
  return (
    <Card sx={{ height: '100%', overflow: 'hidden' }}>
      <Skeleton variant="rectangular" animation="wave" sx={{ height: 160 }} />
      <Box sx={{ p: 2 }}>
        <Skeleton width="70%" height={26} />
        <Skeleton width="45%" height={18} />
        <Skeleton width="85%" height={18} />
        <Skeleton variant="rounded" width="100%" height={6} sx={{ mt: 1.5 }} />
      </Box>
    </Card>
  )
}

function summaryLine(place: {
  category?: PlaceCategory | null
  distanceKm?: number | null
  hourlyRate?: number | null
}) {
  const isPaid = place.hourlyRate != null && Number(place.hourlyRate) > 0
  return [
    place.category ? CATEGORY_LABEL[place.category] : 'Parking',
    place.distanceKm != null ? `${place.distanceKm.toFixed(2)} km` : null,
    isPaid ? `₹${Number(place.hourlyRate).toFixed(0)}/hr` : 'Free parking',
  ]
    .filter(Boolean)
    .join(' · ')
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PlaceCategory | 'ALL'>('ALL')
  const [sort, setSort] = useState<Sort>('DISTANCE')
  const [coords] = useState(HYDERABAD_CENTER)
  // Keeps typing responsive while the list re-queries on every keystroke.
  const deferredQuery = useDeferredValue(query)

  const placesQuery = useQuery({
    queryKey: queryKeys.places.list({
      lat: coords.latitude,
      lng: coords.longitude,
      q: deferredQuery.trim() || undefined,
      category: category === 'ALL' ? undefined : category,
    }),
    queryFn: () =>
      placesApi.search({
        lat: coords.latitude,
        lng: coords.longitude,
        q: deferredQuery.trim() || undefined,
        category: category === 'ALL' ? undefined : category,
      }),
  })

  useOccupancyStream(
    () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
    },
    { debounceMs: 400 }
  )

  const places = useMemo(() => {
    const data = [...(placesQuery.data ?? [])]
    if (sort === 'AVAILABILITY') {
      data.sort((a, b) => b.availableSpaces - a.availableSpaces)
    } else if (sort === 'RATE') {
      data.sort((a, b) => (a.hourlyRate ?? Infinity) - (b.hourlyRate ?? Infinity))
    }
    return data
  }, [placesQuery.data, sort])

  const availableNearby = places.reduce((total, place) => total + place.availableSpaces, 0)
  const searching = deferredQuery !== query

  return (
    <Box>
      <PageHeader
        title={`Parking near ${user?.organizationName ?? 'MG Road'}`}
        subtitle="Every registered place, sorted by proximity."
      />

      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search cafés, malls, areas…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              clickable
              color={category === item.value ? 'primary' : 'default'}
              variant={category === item.value ? 'filled' : 'outlined'}
              onClick={() => setCategory(item.value)}
            />
          ))}
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              className="stream-live-dot"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: '#1A7F37',
                boxShadow: '0 0 6px #1A7F37',
              }}
            />
            <Typography variant="body2" color="text.secondary" aria-live="polite">
              {placesQuery.isFetching
                ? 'Updating availability…'
                : `${places.length} place${places.length === 1 ? '' : 's'} · ${availableNearby} spot${
                    availableNearby === 1 ? '' : 's'
                  } free`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Sort
            </Typography>
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                clickable
                size="small"
                color={sort === option.value ? 'primary' : 'default'}
                variant={sort === option.value ? 'filled' : 'outlined'}
                onClick={() => setSort(option.value)}
              />
            ))}
          </Stack>
        </Stack>
      </Stack>

      {placesQuery.isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 6 }, (_, index) => (
            <Grid item xs={12} sm={6} lg={4} key={index}>
              <PlaceCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : placesQuery.isError ? (
        <ErrorState
          title="Failed to load places"
          subtitle={
            placesQuery.error instanceof Error
              ? placesQuery.error.message
              : 'Could not connect to the server. Please verify your connection.'
          }
          onRetry={() => placesQuery.refetch()}
        />
      ) : places.length === 0 ? (
        <EmptyState
          title="No places found"
          subtitle={
            query
              ? `Nothing matches “${query}”.`
              : category !== 'ALL'
                ? 'No places in this category yet.'
                : 'Try another category.'
          }
        />
      ) : (
        <Grid container spacing={2.5} sx={{ opacity: searching ? 0.6 : 1, transition: 'opacity 180ms ease' }}>
          {places.map((place, index) => {
            const full = place.totalSpaces > 0 && place.availableSpaces === 0
            const rate =
              place.totalSpaces === 0 ? 0 : Math.round((place.occupiedSpaces / place.totalSpaces) * 100)
            return (
              <Grid item xs={12} sm={6} lg={4} key={place.siteId}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.3) }}
                  style={{ height: '100%' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      overflow: 'hidden',
                      transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                      '&:hover': {
                        boxShadow: (t) =>
                          t.palette.mode === 'dark'
                            ? '0 12px 24px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)'
                            : '0 12px 24px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)',
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => navigate(`/places/${place.siteId}`)}
                      sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                    >
                      <Box
                        sx={{
                          height: 168,
                          position: 'relative',
                          overflow: 'hidden',
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: place.coverImageUrl ? `url(${place.coverImageUrl})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            '.MuiCard-root:hover &': {
                              transform: 'scale(1.05)',
                            },
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)',
                          }}
                        />
                        <Chip
                          size="small"
                          label={full ? 'Full' : `${place.availableSpaces} spots free`}
                          color={full ? 'error' : 'success'}
                          sx={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            color: '#fff',
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                          }}
                        />
                      </Box>
                      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" noWrap fontWeight={700}>
                          {place.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                          <PlaceRoundedIcon sx={{ fontSize: 14 }} />
                          <Typography variant="body2" noWrap>
                            {summaryLine(place)}
                          </Typography>
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          display="block"
                          sx={{ mt: 0.5 }}
                        >
                          {[place.address, place.city].filter(Boolean).join(', ') || 'Address not provided'}
                        </Typography>
                        <Box sx={{ mt: 'auto', pt: 1.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={rate}
                            color={rate > 80 ? 'error' : rate > 55 ? 'warning' : 'success'}
                            aria-label={`${rate}% occupied`}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {rate}% occupied
                          </Typography>
                        </Box>
                      </Box>
                    </CardActionArea>
                  </Card>
                </motion.div>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}
