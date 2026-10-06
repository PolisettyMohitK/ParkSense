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
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import { placesApi, CATEGORY_LABEL } from '../api/places'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import { useAppSelector } from '../store/hooks'
import type { PlaceCategory } from '../types'

const MG_ROAD = { latitude: 12.9756, longitude: 77.6053 }

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

export default function ExplorePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PlaceCategory | 'ALL'>('ALL')
  const [coords] = useState(MG_ROAD)

  const placesQuery = useQuery({
    queryKey: ['places', coords.latitude, coords.longitude, query, category],
    queryFn: () =>
      placesApi.search({
        lat: coords.latitude,
        lng: coords.longitude,
        q: query.trim() || undefined,
        category: category === 'ALL' ? undefined : category,
      }),
  })

  useOccupancyStream(() => {
    queryClient.invalidateQueries({ queryKey: ['places'] })
  })

  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data])

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
      </Stack>

      {placesQuery.isLoading ? (
        <LoadingState minHeight={320} />
      ) : places.length === 0 ? (
        <EmptyState
          title="No places found"
          subtitle={query ? `Nothing matches “${query}”.` : 'Try another category.'}
        />
      ) : (
        <Grid container spacing={2.5}>
          {places.map((place, index) => {
            const full = place.totalSpaces > 0 && place.availableSpaces === 0
            const rate =
              place.totalSpaces === 0 ? 0 : Math.round((place.occupiedSpaces / place.totalSpaces) * 100)
            return (
              <Grid item xs={12} sm={6} lg={4} key={place.siteId}>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                >
                  <Card sx={{ height: '100%', overflow: 'hidden' }}>
                    <CardActionArea onClick={() => navigate(`/places/${place.siteId}`)}>
                      <Box
                        sx={{
                          height: 160,
                          position: 'relative',
                          backgroundImage: place.coverImageUrl ? `url(${place.coverImageUrl})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          bgcolor: 'action.hover',
                        }}
                      >
                        <Chip
                          size="small"
                          label={full ? 'Full' : `${place.availableSpaces} spots`}
                          color={full ? 'error' : 'success'}
                          sx={{ position: 'absolute', top: 12, left: 12, color: '#fff' }}
                        />
                      </Box>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="h6" noWrap>
                          {place.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                          <PlaceRoundedIcon sx={{ fontSize: 14 }} />
                          <Typography variant="body2" noWrap>
                            {place.category ? CATEGORY_LABEL[place.category] : 'Parking'}
                            {place.distanceKm != null ? ` · ${place.distanceKm.toFixed(2)} km` : ''}
                            {place.hourlyRate != null ? ` · ₹${Number(place.hourlyRate).toFixed(0)}/hr` : ''}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ mt: 0.5 }}>
                          {[place.address, place.city].filter(Boolean).join(', ')}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={rate}
                          sx={{ mt: 1.5, height: 6, borderRadius: 3 }}
                          color={rate > 80 ? 'error' : rate > 55 ? 'warning' : 'success'}
                        />
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
