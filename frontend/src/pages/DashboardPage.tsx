import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import LoadingState from '../components/LoadingState'
import StatusChip from '../components/StatusChip'
import { zonesApi, spacesApi } from '../api/parking'
import { reservationsApi } from '../api/reservations'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { OccupancyChangedEvent } from '../types'
import { formatDistanceToNow } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#22c55e',
  OCCUPIED: '#ef4444',
  RESERVED: '#f59e0b',
  OUT_OF_SERVICE: '#64748b',
}

export default function DashboardPage() {
  const theme = useTheme()
  const [liveEvents, setLiveEvents] = useState<OccupancyChangedEvent[]>([])

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const spacesQuery = useQuery({ queryKey: ['spaces'], queryFn: () => spacesApi.list() })
  const reservationsQuery = useQuery({ queryKey: ['reservations'], queryFn: () => reservationsApi.list() })

  useOccupancyStream((event) => {
    setLiveEvents((prev) => [event, ...prev].slice(0, 8))
  })

  const zones = zonesQuery.data ?? []
  const spaces = spacesQuery.data ?? []
  const reservations = reservationsQuery.data ?? []

  const stats = useMemo(() => {
    const totalSpaces = spaces.length
    const occupied = spaces.filter((space) => space.status === 'OCCUPIED').length
    const available = spaces.filter((space) => space.status === 'AVAILABLE').length
    const activeReservations = reservations.filter((reservation) =>
      ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(reservation.status),
    ).length
    return { totalSpaces, occupied, available, activeReservations }
  }, [spaces, reservations])

  const occupancyData = useMemo(
    () =>
      zones.map((zone) => ({
        name: zone.code,
        Occupied: zone.occupiedSpaces,
        Available: zone.availableSpaces,
      })),
    [zones],
  )

  const statusData = useMemo(() => {
    const counts = new Map<string, number>()
    spaces.forEach((space) => counts.set(space.status, (counts.get(space.status) ?? 0) + 1))
    return Array.from(counts.entries()).map(([status, value]) => ({ name: status, value }))
  }, [spaces])

  if (zonesQuery.isLoading || spacesQuery.isLoading) {
    return <LoadingState minHeight={400} />
  }

  return (
    <Box>
      <PageHeader
        title="Operations dashboard"
        subtitle="Live occupancy, capacity and reservations across all parking zones."
      />

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Zones" value={zones.length} icon={<LocalParkingRoundedIcon />} accent="#6366f1" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Total spaces" value={stats.totalSpaces} icon={<GridViewRoundedIcon />} accent="#22d3ee" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Available now"
            value={stats.available}
            hint={`${stats.occupied} occupied`}
            icon={<CheckCircleRoundedIcon />}
            accent="#22c55e"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Active reservations"
            value={stats.activeReservations}
            icon={<EventAvailableRoundedIcon />}
            accent="#f59e0b"
          />
        </Grid>

        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Occupancy by zone
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancyData} barGap={6}>
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 10,
                        color: theme.palette.text.primary,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Occupied" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Available" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Space status mix
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={3}>
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 10,
                        color: theme.palette.text.primary,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Zone capacity
              </Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {zones.map((zone) => {
                  const rate = zone.totalSpaces === 0 ? 0 : (zone.occupiedSpaces / zone.totalSpaces) * 100
                  return (
                    <Box key={zone.id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {zone.name} · {zone.code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {zone.occupiedSpaces}/{zone.totalSpaces}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={rate}
                        sx={{ mt: 0.8, height: 8, borderRadius: 4 }}
                        color={rate > 80 ? 'error' : rate > 55 ? 'warning' : 'success'}
                      />
                    </Box>
                  )
                })}
                {zones.length === 0 && (
                  <Typography color="text.secondary" variant="body2">
                    No zones configured yet.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <BoltRoundedIcon color="secondary" fontSize="small" />
                <Typography variant="h6">Live activity</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Occupancy events stream in real time over WebSocket.
              </Typography>
              <Stack spacing={1.2} sx={{ mt: 2 }}>
                {liveEvents.map((event, index) => (
                  <Stack
                    key={`${event.spaceId}-${event.occurredAt}-${index}`}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ p: 1.2, borderRadius: 2, bgcolor: 'action.hover' }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {event.spaceCode ?? `#${event.spaceId}`} · {event.zoneName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.source} · {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                      </Typography>
                    </Box>
                    <StatusChip kind="space" value={event.state === 'VACANT' ? 'AVAILABLE' : event.state} />
                  </Stack>
                ))}
                {liveEvents.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    Waiting for live events… toggle a space state to see updates here.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
