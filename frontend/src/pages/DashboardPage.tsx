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
import { zonesApi } from '../api/parking'
import { analyticsApi } from '../api/analytics'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import ErrorState from '../components/ErrorState'
import { useQueryClient } from '@tanstack/react-query'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { OccupancyChangedEvent } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { STATUS } from '../theme'

export default function DashboardPage() {
  const theme = useTheme()
  const [liveEvents, setLiveEvents] = useState<OccupancyChangedEvent[]>([])

  const queryClient = useQueryClient()
  const zonesQuery = useQuery({ queryKey: queryKeys.zones.list(), queryFn: () => zonesApi.list() })
  const summaryQuery = useQuery({ queryKey: queryKeys.analytics.summary, queryFn: analyticsApi.summary })

  useOccupancyStream((event) => {
    setLiveEvents((prev) => [event, ...prev].slice(0, 8))
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

  const stats = {
    totalSpaces: summary?.spaces ?? 0,
    occupied: summary?.occupied ?? 0,
    available: summary?.available ?? 0,
    activeReservations: summary?.activeReservations ?? 0,
  }

  // Busiest areas first so the chart stays readable with many venues.
  const occupancyData = useMemo(
    () =>
      [...zones]
        .filter((zone) => zone.totalSpaces > 0)
        .sort((a, b) => b.occupiedSpaces / b.totalSpaces - a.occupiedSpaces / a.totalSpaces)
        .slice(0, 10)
        .map((zone) => ({
          name: `${zone.siteName.split(' ')[0]} ${zone.code}`,
          Occupied: zone.occupiedSpaces,
          Available: zone.availableSpaces,
        })),
    [zones],
  )

  const statusData = useMemo(
    () =>
      summary
        ? [
            { name: 'AVAILABLE', value: summary.available },
            { name: 'OCCUPIED', value: summary.occupied },
            { name: 'RESERVED', value: summary.reserved },
            { name: 'OUT_OF_SERVICE', value: summary.outOfService },
          ].filter((entry) => entry.value > 0)
        : [],
    [summary],
  )

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
    <Box>
      <PageHeader
        title="Operations dashboard"
        subtitle="Live occupancy, capacity and reservations across all parking zones."
      />

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Zones" value={zones.length} icon={<LocalParkingRoundedIcon />} accent={theme.palette.text.primary} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard label="Total spaces" value={stats.totalSpaces} icon={<GridViewRoundedIcon />} accent={theme.palette.text.primary} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Available now"
            value={stats.available}
            hint={`${stats.occupied} occupied`}
            icon={<CheckCircleRoundedIcon />}
            accent={STATUS[theme.palette.mode === 'dark' ? 'dark' : 'light'].free}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Active reservations"
            value={stats.activeReservations}
            icon={<EventAvailableRoundedIcon />}
            accent={STATUS[theme.palette.mode === 'dark' ? 'dark' : 'light'].reserved}
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
                    <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                    <YAxis stroke={theme.palette.text.secondary} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 10,
                        color: theme.palette.text.primary,
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Occupied"
                      fill={STATUS[theme.palette.mode === 'dark' ? 'dark' : 'light'].occupied}
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="Available"
                      fill={STATUS[theme.palette.mode === 'dark' ? 'dark' : 'light'].free}
                      radius={[6, 6, 0, 0]}
                    />
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
                      {statusData.map((entry) => {
                        const statusColors = STATUS[theme.palette.mode === 'dark' ? 'dark' : 'light']
                        const fill =
                          entry.name === 'AVAILABLE'
                            ? statusColors.free
                            : entry.name === 'OCCUPIED'
                            ? statusColors.occupied
                            : entry.name === 'RESERVED'
                            ? statusColors.reserved
                            : statusColors.offline
                        return <Cell key={entry.name} fill={fill} />
                      })}
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
                          {zone.siteName} · {zone.name}
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
