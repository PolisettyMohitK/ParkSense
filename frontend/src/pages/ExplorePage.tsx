import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import PlaceCard from '../components/PlaceCard'
import CategoryRow from '../components/CategoryRow'
import { placesApi, CATEGORY_LABEL } from '../api/places'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useUserLocation } from '../hooks/useUserLocation'
import ActiveStayCard from '../components/ActiveStayCard'
import { apiErrorMessage } from '../api/client'
import { formatMoney } from '../utils/format'
import { PlaceGridSkeleton } from '../components/Skeletons'
import { NumericReadout } from '../components/Stark'
import type { PlaceCategory } from '../types'

const CATEGORIES: Array<{ value: PlaceCategory | 'ALL'; label: string }> = [
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
  const theme = useTheme()
  const queryClient = useQueryClient()
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
    { debounceMs: 400 },
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
    <div>
      <ActiveStayCard />

      {/* Hero: one line, one live number, one search field. */}
      <header style={hero}>
        <div style={heroLine}>
          <h1 style={heroTitle}>{coords.precise ? 'Parking near you' : 'Parking in Hyderabad'}</h1>
          <NumericReadout
            value={availableNearby}
            suffix=" bays free"
            size={18}
            weight={500}
            color={theme.stark.holo}
          />
        </div>

        <div style={searchWrap}>
          <SearchRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cafés, malls, areas…"
            aria-label="Search places"
            style={searchInput}
          />
          <kbd style={shortcut}>
            <span style={{ fontSize: 11 }}>⌘K</span>
          </kbd>
        </div>

        <CategoryRow options={CATEGORIES} value={category} onChange={setCategory} />
      </header>

      <div style={resultBar}>
        <span aria-live="polite" style={resultCount(theme)}>
          {placesQuery.isFetching
            ? 'Updating availability…'
            : `${places.length} place${places.length === 1 ? '' : 's'}`}
        </span>
        <div style={sortRow}>
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setSort(option.value)}
                style={sortChip(theme, active)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {placesQuery.isLoading ? (
        <PlaceGridSkeleton count={6} />
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
        <div style={grid(searching)}>
          {places.map((place, index) => (
            <PlaceCard
              key={place.siteId}
              place={place}
              index={index}
              hovered={hoveredSiteId === place.siteId}
              onHover={setHoveredSiteId}
              onOpen={() => navigate(`/places/${place.siteId}`)}
              summary={summaryLine(place)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const hero: CSSProperties = { marginBottom: 28 }

const heroLine: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 14,
  flexWrap: 'wrap',
  marginBottom: 18,
}

const heroTitle: CSSProperties = {
  fontSize: 'clamp(24px, 3vw, 34px)',
  lineHeight: 1.12,
  letterSpacing: '-0.02em',
  fontWeight: 600,
  margin: 0,
}

const searchWrap: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  marginBottom: 16,
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-hairline-strong)',
  background: 'var(--color-surface-glass)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  transition: 'border-color 120ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 120ms',
}

const searchInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 0,
  outline: 'none',
  background: 'transparent',
  color: 'var(--color-text-primary)',
  font: 'inherit',
  fontSize: 17,
}

const shortcut: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--color-text-tertiary)',
  padding: '2px 6px',
  borderRadius: 6,
  border: '1px solid var(--color-hairline)',
  lineHeight: 1.6,
}

const resultBar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 16,
}

const resultCount = (theme: Theme): CSSProperties => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
})

const sortRow: CSSProperties = { display: 'flex', gap: 6 }

const sortChip = (theme: Theme, active: boolean): CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 999,
  border: `1px solid ${active ? theme.stark.holo : theme.stark.hairline}`,
  background: active ? theme.stark.holoSoft : 'transparent',
  color: active ? theme.stark.holo : theme.palette.text.secondary,
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
})

const grid = (dimmed: boolean): CSSProperties => ({
  display: 'grid',
  gap: 24,
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  opacity: dimmed ? 0.6 : 1,
  transition: 'opacity 180ms cubic-bezier(0.2,0.8,0.2,1)',
})
