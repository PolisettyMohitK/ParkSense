import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import PercentRoundedIcon from '@mui/icons-material/PercentRounded'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import LoadingState from '../components/LoadingState'
import { analyticsApi } from '../api/analytics'
import { zonesApi } from '../api/parking'
import { useTheme } from '@mui/material/styles'
import { STATUS } from '../theme'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function heatColor(value: number, max: number, isDark: boolean) {
  if (value === 0 || max === 0) return isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const intensity = (0.12 + (value / max) * 0.76).toFixed(2)
  return isDark ? `rgba(250,250,250,${intensity})` : `rgba(10,10,10,${intensity})`
}

export default function AnalyticsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const statusColors = STATUS[isDark ? 'dark' : 'light']
  const [zoneId, setZoneId] = useState<number | ''>('')

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const summaryQuery = useQuery({ queryKey: ['analytics-summary'], queryFn: () => analyticsApi.summary() })
  const utilizationQuery = useQuery({
    queryKey: ['analytics-utilization', zoneId],
    queryFn: () => analyticsApi.utilization(zoneId === '' ? {} : { zoneId }),
  })
  const heatmapQuery = useQuery({
    queryKey: ['analytics-heatmap', zoneId],
    queryFn: () => analyticsApi.heatmap(zoneId === '' ? {} : { zoneId }),
  })

  const summary = summaryQuery.data
  const utilization = utilizationQuery.data ?? []
  const heatmap = heatmapQuery.data ?? []

  const utilizationChart = useMemo(
    () =>
      utilization.map((point) => ({
        time: format(new Date(point.bucket), 'dd MMM HH:mm'),
        Occupied: point.occupiedEvents,
        Vacant: point.vacantEvents,
      })),
    [utilization],
  )

  const maxHeat = useMemo(() => Math.max(0, ...heatmap.map((cell) => cell.events)), [heatmap])

  const cellFor = (day: number, hour: number) =>
    heatmap.find((cell) => cell.dayOfWeek === day && cell.hour === hour)?.events ?? 0

  return (
    <Box>
      <PageHeader
        title="Analytics"
        subtitle="Utilization trends, peak activity and spatial-temporal heat maps."
        action={
          <TextField
            select
            label="Zone"
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value === '' ? '' : Number(event.target.value))}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All zones</MenuItem>
            {(zonesQuery.data ?? []).map((zone) => (
              <MenuItem key={zone.id} value={zone.id}>
                {zone.name} ({zone.code})
              </MenuItem>
            ))}
          </TextField>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Utilization"
            value={`${Math.round((summary?.utilizationRate ?? 0) * 100)}%`}
            hint={`${summary?.occupied ?? 0} of ${summary?.spaces ?? 0} spaces`}
            icon={<PercentRoundedIcon />}
            accent={theme.palette.text.primary}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Occupancy events"
            value={summary?.occupancyEvents ?? 0}
            icon={<BoltRoundedIcon />}
            accent={theme.palette.text.primary}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Active reservations"
            value={summary?.activeReservations ?? 0}
            hint={`${summary?.activeSessions ?? 0} active sessions · avg ${
              Math.round(summary?.averageSessionMinutes ?? 0)
            } min`}
            icon={<InsightsRoundedIcon />}
            accent={statusColors.reserved}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            label="Devices"
            value={summary?.devices ?? 0}
            hint={`${summary?.zones ?? 0} zones`}
            icon={<GridViewRoundedIcon />}
            accent={theme.palette.text.primary}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Occupancy activity over time
              </Typography>
              {utilizationQuery.isLoading ? (
                <LoadingState minHeight={280} />
              ) : (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={utilizationChart}>
                      <defs>
                        <linearGradient id="occupied" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={statusColors.occupied} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={statusColors.occupied} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="vacant" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={statusColors.free} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={statusColors.free} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis dataKey="time" stroke={theme.palette.text.secondary} fontSize={12} />
                      <YAxis stroke={theme.palette.text.secondary} allowDecimals={false} fontSize={12} />
                      <ChartTooltip
                        contentStyle={{
                          background: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 10,
                          color: theme.palette.text.primary,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Occupied"
                        stroke={statusColors.occupied}
                        fill="url(#occupied)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="Vacant"
                        stroke={statusColors.free}
                        fill="url(#vacant)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Peak occupancy heat map
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Events by day of week and hour (UTC). Darker = more activity.
              </Typography>
              <Box sx={{ overflowX: 'auto', mt: 2 }}>
                <Box sx={{ minWidth: 760 }}>
                  <Stack direction="row" spacing={0.5} sx={{ ml: 6, mb: 0.5 }}>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <Typography
                        key={hour}
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: 26, textAlign: 'center', fontSize: 10 }}
                      >
                        {hour}
                      </Typography>
                    ))}
                  </Stack>
                  {DAYS.map((day, index) => (
                    <Stack key={day} direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ width: 44 }}>
                        {day}
                      </Typography>
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const value = cellFor(index + 1, hour)
                        return (
                          <Tooltip key={hour} title={`${day} ${hour}:00 — ${value} events`}>
                            <Box
                              sx={{
                                width: 26,
                                height: 26,
                                borderRadius: 0.75,
                                bgcolor: heatColor(value, maxHeat, isDark),
                                border: `1px solid ${theme.palette.divider}`,
                              }}
                            />
                          </Tooltip>
                        )
                      })}
                    </Stack>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
