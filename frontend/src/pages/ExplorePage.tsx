import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  Grid,
  InputAdornment,
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
import PlacePhotoSlideshow from '../components/PlacePhotoSlideshow'
import { placesApi, CATEGORY_LABEL } from '../api/places'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useUserLocation } from '../hooks/useUserLocation'
import ActiveStayCard from '../components/ActiveStayCard'
import { apiErrorMessage } from '../api/client'
import { formatMoney } from '../utils/format'
import { useAppSelector } from '../store/hooks'
import type { PlaceCategory } from '../types'

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
    place.distanceKm != null ? `${place.distanceKm.toFixed(1)} km` : null,
    isPaid ? `${formatMoney(Number(place.hourlyRate))}/hr` : 'Free parking',
  ]
    .filter(Boolean)
    .join(' · ')
}

export default function ExplorePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const coords = useUserLocation()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PlaceCategory | 'ALL'>('ALL')
  const [sort, setSort] = useState<Sort>('DISTANCE')
  const [hoveredSiteId, setHoveredSiteId] = useState<number | null>(null)
  // Wait for a pause in typing before querying the server.
  const deferredQuery = useDebouncedValue(query, 300)

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
    placeholderData: (previous) => previous,
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
        title={coords.precise ? 'Parking near you' : 'Parking in Hyderabad'}
        subtitle={
          coords.precise
            ? 'Live availability at places around you, nearest first.'
            : `Live availability across the city${user ? `, ${user.fullName.split(' ')[0]}` : ''}. Allow location access to sort by distance from you.`
        }
      />

      {user?.role === 'USER' && <ActiveStayCard />}

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
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {placesQuery.isFetching
              ? 'Updating availability…'
              : `${places.length} place${places.length === 1 ? '' : 's'} · ${availableNearby} spot${
                  availableNearby === 1 ? '' : 's'
                } free`}
          </Typography>
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
          subtitle={apiErrorMessage(placesQuery.error)}
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
            const isHovered = hoveredSiteId === place.siteId

            return (
              <Grid item xs={12} sm={6} lg={4} key={place.siteId}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.035, 0.25) }}
                  onMouseEnter={() => setHoveredSiteId(place.siteId)}
                  onMouseLeave={() => setHoveredSiteId(null)}
                  style={{ height: '100%' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      overflow: 'hidden',
                      transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                      borderColor: isHovered ? 'text.secondary' : 'divider',
                      boxShadow: isHovered
                        ? (t) =>
                            t.palette.mode === 'dark'
                              ? '0 16px 36px -8px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12)'
                              : '0 16px 36px -8px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.08)'
                        : 'none',
                    }}
                  >
                    <CardActionArea
                      onClick={() => navigate(`/places/${place.siteId}`)}
                      sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <PlacePhotoSlideshow
                          photos={place.photoUrls}
                          coverImageUrl={place.coverImageUrl}
                          height={180}
                          autoPlay={false}
                          isHovered={isHovered}
                        />

                        {/* Minimal translucent silver capsule for spot status */}
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 12,
                            left: 12,
                            px: 1.25,
                            py: 0.4,
                            borderRadius: 99,
                            bgcolor: 'rgba(10,10,12,0.72)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255,255,255,0.16)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            sx={{
                              color: '#FAFAFA',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              letterSpacing: 0.2,
                            }}
                          >
                            {full ? 'Occupied' : `${place.availableSpaces} spots free`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ p: 2.25, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" noWrap fontWeight={700}>
                          {place.name}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                          sx={{ color: 'text.secondary', mt: 0.5 }}
                        >
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
                          {[place.address, place.city].filter(Boolean).join(', ') || 'Hyderabad'}
                        </Typography>

                        <Box
                          sx={{
                            mt: 'auto',
                            pt: 1.75,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: 1,
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {place.totalSpaces} total bays
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: full ? 'text.secondary' : 'text.primary',
                            }}
                          >
                            {full ? 'Currently full' : `${place.availableSpaces} available`}
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
