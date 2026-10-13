import { useMemo, useState, type CSSProperties } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import CityOverview from '../components/CityOverview'
import ZoneCapacityList from '../components/ZoneCapacityList'
import { zonesApi, sitesApi } from '../api/parking'
import { analyticsApi } from '../api/analytics'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import { LiveDot } from '../components/Stark'
import { radius } from '../theme'
import type { OccupancyChangedEvent } from '../types'

export default function DashboardPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [liveEvents, setLiveEvents] = useState<OccupancyChangedEvent[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
  const [overviewSize, setOverviewSize] = useState({ width: 720, height: 340 })
  const queryClient = useQueryClient()

  const zonesQuery = useQuery({ queryKey: queryKeys.zones.list(), queryFn: () => zonesApi.list() })
  const summaryQuery = useQuery({ queryKey: queryKeys.analytics.summary, queryFn: analyticsApi.summary })
  const sitesQuery = useQuery({ queryKey: queryKeys.sites.list(), queryFn: () => sitesApi.list() })

  useOccupancyStream((event) => {
    setLiveEvents((prev) => [event, ...prev].slice(0, 12))
  })
  // Counts refresh at most every couple of seconds even during bursts of camera events.
  useOccupancyStream(
    () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.summary })
      queryClient.invalidateQueries({ queryKey: queryKeys.zones.list() })
    },
    { debounceMs: 2000 },
  )

  const zones = useMemo(() => zonesQuery.data ?? [], [zonesQuery.data])
  const summary = summaryQuery.data

  const siteCoords = useMemo(() => {
    const map: Record<number, { lat: number; lng: number }> = {}
    for (const site of sitesQuery.data ?? []) {
      if (site.latitude != null && site.longitude != null) {
        map[site.id] = { lat: site.latitude, lng: site.longitude }
      }
    }
    return map
  }, [sitesQuery.data])

  const siteNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const site of sitesQuery.data ?? []) map[site.id] = site.name
    return map
  }, [sitesQuery.data])

  if (zonesQuery.isLoading || summaryQuery.isLoading) {
    return <LoadingState minHeight={400} />
  }

  if (zonesQuery.isError || summaryQuery.isError) {
    return (
      <ErrorState
        subtitle={apiErrorMessage(zonesQuery.error ?? summaryQuery.error)}
        onRetry={() => {
          zonesQuery.refetch()
          summaryQuery.refetch()
        }}
      />
    )
  }

  return (
    <div>
      <PageHeader
        overline="Operations"
        title="Dashboard"
        subtitle="Live occupancy, capacity and reservations across every parking area."
      />

      {/* Four KPI readouts in a single row. */}
      <div style={kpiRow}>
        <StatCard label="Zones" value={zones.length} icon={<LocalParkingRoundedIcon />} accent={theme.stark.holo} />
        <StatCard
          label="Total spaces"
          value={summary?.spaces ?? 0}
          icon={<GridViewRoundedIcon />}
          accent={theme.stark.holo}
        />
        <StatCard
          label="Available now"
          value={summary?.available ?? 0}
          hint={`${summary?.occupied ?? 0} occupied`}
          icon={<CheckCircleRoundedIcon />}
          accent={theme.stark.status.free}
        />
        <StatCard
          label="Active reservations"
          value={summary?.activeReservations ?? 0}
          icon={<EventAvailableRoundedIcon />}
          accent={theme.stark.status.reserved}
        />
      </div>

      <div style={split}>
        <section aria-label="City overview" style={panel(theme)}>
          <header style={panelHead}>
            <div>
              <div style={overline}>City overview</div>
              <div style={panelTitle}>Every venue, by position</div>
            </div>
            <LiveBadge />
          </header>
          <div
            ref={(node) => {
              if (!node) return
              const rect = node.getBoundingClientRect()
              if (rect.width > 0 && Math.abs(rect.width - overviewSize.width) > 4) {
                setOverviewSize({ width: rect.width, height: Math.max(260, Math.min(380, rect.width * 0.46)) })
              }
            }}
            style={overviewBox}
          >
            <CityOverview
              zones={zones}
              siteCoords={siteCoords}
              width={overviewSize.width}
              height={overviewSize.height}
              selectedSiteId={selectedSiteId}
              onSelect={(zone) => {
                setSelectedSiteId(zone.siteId)
                navigate(`/zones/${zone.id}`)
              }}
            />
          </div>
          <p style={hint(theme)}>Select a slab to open that area in operator mode.</p>
        </section>

        <section aria-label="Live activity" style={panel(theme)}>
          <header style={panelHead}>
            <div>
              <div style={overline}>Event stream</div>
              <div style={panelTitle}>Live activity</div>
            </div>
            <LiveDot />
          </header>
          <div style={terminal(theme)}>
            {liveEvents.length === 0 ? (
              <div style={terminalIdle(theme)}>
                waiting for events… toggle a space state anywhere to see it land here
              </div>
            ) : (
              liveEvents.map((event, index) => (
                <div key={`${event.spaceId}-${event.occurredAt}-${index}`} style={logLine(theme, index)}>
                  <span style={logTime}>
                    {new Date(event.occurredAt).toLocaleTimeString(undefined, {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span style={logText}>
                    {(event.spaceCode ?? `#${event.spaceId}`).padEnd(6, ' ')} {event.zoneName}
                  </span>
                  <span style={logState(event.state)}>
                    {event.state === 'VACANT' ? 'FREE' : event.state.toUpperCase()}
                  </span>
                  <span style={logSource}>{event.source.toLowerCase()}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section style={{ ...panel(theme), marginTop: 24 }}>
        <header style={panelHead}>
          <div>
            <div style={overline}>Capacity</div>
            <div style={panelTitle}>Zone utilisation</div>
          </div>
        </header>
        <ZoneCapacityList zones={zones} siteNames={siteNameById} />
      </section>
    </div>
  )
}

function LiveBadge() {
  return (
    <span style={liveBadge}>
      <LiveDot />
      <span style={liveBadgeText}>LIVE</span>
    </span>
  )
}

const kpiRow: CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  marginBottom: 24,
}

const split: CSSProperties = {
  display: 'grid',
  gap: 24,
  gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
  alignItems: 'start',
}

const panel = (theme: Theme): CSSProperties => ({
  padding: 20,
  borderRadius: radius.panel,
  border: `1px solid ${theme.stark.hairline}`,
  backgroundColor: theme.stark.surface,
  boxShadow: theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : theme.stark.shadowLight,
})

const panelHead: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
}

const overline: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

const panelTitle: CSSProperties = {
  fontSize: 17,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  marginTop: 4,
}

const overviewBox: CSSProperties = { width: '100%', height: 340 }

const hint = (theme: Theme): CSSProperties => ({
  fontSize: 12,
  color: theme.palette.text.tertiary,
  marginTop: 12,
})

const terminal = (theme: Theme): CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  lineHeight: 1.7,
  maxHeight: 300,
  overflowY: 'auto',
  padding: '10px 12px',
  borderRadius: radius.chip,
  border: `1px solid ${theme.stark.hairline}`,
  backgroundColor: theme.palette.mode === 'dark' ? theme.stark.surfaceSunken : 'var(--color-surface-sunken)',
})

const terminalIdle = (theme: Theme): CSSProperties => ({
  color: theme.palette.text.tertiary,
  fontSize: 11,
  padding: '18px 4px',
})

const logLine = (theme: Theme, index: number): CSSProperties => ({
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  padding: '2px 0',
  opacity: Math.max(0.35, 1 - index * 0.07),
  color: theme.palette.text.secondary,
})

const logTime: CSSProperties = { color: 'var(--color-text-tertiary)', flexShrink: 0 }

const logText: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--color-text-primary)',
}

const logSource: CSSProperties = { color: 'var(--color-text-tertiary)', flexShrink: 0 }

function logState(state: string): CSSProperties {
  return {
    flexShrink: 0,
    fontWeight: 600,
    color:
      state === 'VACANT' ? 'var(--color-status-free)' : state === 'OCCUPIED' ? 'var(--color-status-occupied)' : 'var(--color-text-tertiary)',
  }
}

const liveBadge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '3px 9px',
  borderRadius: 999,
  border: '1px solid var(--color-hairline-strong)',
}

const liveBadgeText: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.1em',
  color: 'var(--color-text-secondary)',
}
