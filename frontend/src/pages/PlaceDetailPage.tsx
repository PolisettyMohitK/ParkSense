import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Stack } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { PlaceDetailSkeleton } from '../components/Skeletons'
import PlacePhotoSlideshow from '../components/PlacePhotoSlideshow'
import HoloLot from '../components/HoloLot'
import ZoneSwitcher from '../components/PlaceZones'
import PlaceFacts from '../components/PlaceFacts'
import { AMENITY_LABEL, CATEGORY_LABEL, placesApi } from '../api/places'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import BookingDialog, { type BookingTarget } from '../components/BookingDialog'
import NotFoundPage from './NotFoundPage'
import { apiErrorMessage, apiErrorStatus } from '../api/client'
import { useUserLocation } from '../hooks/useUserLocation'
import { formatMoney, parsePositiveInt } from '../utils/format'
import { toHoloLotBays, type ChangedBay } from '../utils/holoLotAdapter'
import type { OccupancyChangedEvent, ParkingZone, PublicSpace } from '../types'

export default function PlaceDetailPage() {
  const params = useParams()
  const siteId = parsePositiveInt(params.siteId)
  const navigate = useNavigate()
  const location = useUserLocation()
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<PublicSpace | null>(null)
  const [booking, setBooking] = useState<BookingTarget | null>(null)
  const [changed, setChanged] = useState<ChangedBay>({ trigger: 0, bayId: null })
  const [tipDismissed, setTipDismissed] = useState(false)
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
      setChanged((prev) => ({ trigger: prev.trigger + 1, bayId: event.spaceId }))
      placeQuery.refetch()
      if (currentZone != null && event.zoneId === currentZone.id) {
        spacesQuery.refetch()
      }
    },
    { debounceMs: 400 },
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

  const { summary } = placeQuery.data
  const isPaid = summary.hourlyRate != null && Number(summary.hourlyRate) > 0
  const mapsUrl =
    summary.latitude != null && summary.longitude != null
      ? `https://www.google.com/maps?q=${summary.latitude},${summary.longitude}`
      : null
  const spaces = spacesQuery.data ?? []
  const bays = toHoloLotBays(spaces)

  return (
    <div>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/explore')}
        sx={{ mb: 2, ml: -1, color: 'text.secondary' }}
      >
        Explore
      </Button>

      {/* Photo fades straight into the canvas - no card, no hard edge. */}
      <PlacePhotoSlideshow
        photos={summary.photoUrls}
        alt={`Photos of ${summary.name}`}
        coverImageUrl={summary.coverImageUrl}
        height={{ xs: 190, md: 300 }}
        autoPlayIntervalMs={5000}
        fadeToCanvas
      />

      <PlaceFacts
        name={summary.name}
        category={summary.category ? CATEGORY_LABEL[summary.category] : undefined}
        rateLabel={isPaid ? `${formatMoney(Number(summary.hourlyRate))}/hr` : 'Free for visitors'}
        isPaid={isPaid}
        address={[summary.organizationName, summary.address, summary.city].filter(Boolean).join(' · ')}
        distanceKm={summary.distanceKm}
        precise={location.precise}
        openingHours={summary.openingHours}
        amenities={summary.amenities.map((amenity) => AMENITY_LABEL[amenity] ?? amenity)}
        mapsUrl={mapsUrl}
      />

      {/* The centrepiece. Full-bleed width, ~60vh on desktop. */}
      <HoloLot
        siteId={siteId ?? 0}
        zoneId={currentZone?.id ?? 0}
        zoneName={currentZone?.name}
        bays={bays}
        selectedBayId={selectedSpace?.id ?? null}
        onSelectBay={(bay) => setSelectedSpace(bay ? spaces.find((s) => s.id === bay.id) ?? null : null)}
        sweepTrigger={changed.trigger}
        changedBayId={changed.bayId}
        height={{ xs: 340, sm: 420, md: '58vh' } as unknown as number}
        loading={spacesQuery.isLoading}
        overlay={
          zones.length > 1 ? (
            <ZoneSwitcher zones={zones} activeZoneId={currentZone?.id ?? null} onChange={(id) => {
              setActiveZoneId(id)
              setSelectedSpace(null)
            }} />
          ) : null
        }
      />

      {/* Bay selection continues into the existing booking flow. */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 3 }} flexWrap="wrap" useFlexGap>
        <Button
          variant="contained"
          disabled={zones.length === 0 || bays.length === 0}
          onClick={() =>
            setBooking(
              selectedSpace && currentZone
                ? { siteId: siteId!, zoneId: currentZone.id, spaceId: selectedSpace.id }
                : { siteId: siteId!, zoneId: currentZone?.id ?? null },
            )
          }
        >
          {selectedSpace ? `Reserve bay ${selectedSpace.code}` : 'Reserve a bay'}
        </Button>
        {zones.length === 0 || bays.length === 0 ? (
          <Button variant="outlined" disabled>
            No bays available here yet
          </Button>
        ) : null}
      </Stack>

      {!tipDismissed && zones.length > 0 ? (
        <HowItWorks
          isPaid={isPaid}
          rate={summary.hourlyRate != null ? Number(summary.hourlyRate) : 0}
          onDismiss={() => setTipDismissed(true)}
        />
      ) : null}

      <ZoneList
        zones={zones}
        activeZoneId={currentZone?.id ?? null}
        onView={(id) => {
          setActiveZoneId(id)
          setSelectedSpace(null)
          window.scrollTo({ top: 320, behavior: 'smooth' })
        }}
        onReserve={(id) => setBooking({ siteId: siteId!, zoneId: id })}
      />

      <BookingDialog
        open={booking !== null}
        initial={booking ?? undefined}
        onClose={() => setBooking(null)}
        onBooked={() => {
          setSelectedSpace(null)
          navigate('/reservations')
        }}
      />
    </div>
  )
}

function HowItWorks({
  isPaid,
  rate,
  onDismiss,
}: {
  isPaid: boolean
  rate: number
  onDismiss: () => void
}) {
  const lines = [
    'Pick a free bay on the lot map, or let us auto-assign one.',
    isPaid
      ? `Choose your vehicle and time — you see the price before you book (${formatMoney(rate)} per started hour).`
      : 'Choose your vehicle and time — parking here is free for visitors.',
    'Check in from My parking when you arrive (up to 15 minutes early); check out when you leave.',
  ]
  return (
    <details
      style={{ marginTop: 32, borderTop: `1px solid var(--color-hairline)`, paddingTop: 16 }}
      onToggle={(event) => {
        if (!(event.currentTarget as HTMLDetailsElement).open) onDismiss()
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-text-secondary)',
        }}
      >
        How parking works here
      </summary>
      <ol style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </details>
  )
}

function ZoneList({
  zones,
  activeZoneId,
  onView,
  onReserve,
}: {
  zones: ParkingZone[]
  activeZoneId: number | null
  onView: (id: number) => void
  onReserve: (id: number) => void
}) {
  if (zones.length === 0) {
    return <EmptyState title="No areas configured" subtitle="This place has no parking areas yet." />
  }
  return (
    <section style={{ marginTop: 40 }}>
      <h2
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-text-secondary)',
          margin: '0 0 8px',
        }}
      >
        All parking areas
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {zones.map((zone) => (
          <li
            key={zone.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 0',
              borderTop: '1px solid var(--color-hairline)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{zone.name}</div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                {zone.availableSpaces} free / {zone.totalSpaces}
                {zone.floor ? ` · ${zone.floor}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" onClick={() => onView(zone.id)}>
                {activeZoneId === zone.id ? 'Viewing' : 'View'}
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={zone.availableSpaces === 0}
                onClick={() => onReserve(zone.id)}
              >
                Reserve
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
