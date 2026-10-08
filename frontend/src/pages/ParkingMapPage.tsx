import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import { spacesApi, zonesApi } from '../api/parking'
import { occupancyApi } from '../api/occupancy'
import { apiErrorMessage } from '../api/client'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { SpaceStatus } from '../types'
import { designTokens } from '../theme/tokens.generated'

const SPACE_W = 84
const SPACE_H = 104

export default function ParkingMapPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const tokens = isDark ? designTokens.color.dark : designTokens.color.light

  const fillMap: Record<SpaceStatus, string> = {
    AVAILABLE: tokens.statusFreeDim,
    OCCUPIED: tokens.statusOccupiedDim,
    RESERVED: tokens.statusReservedDim,
    OUT_OF_SERVICE: tokens.statusOfflineDim,
  }

  const borderMap: Record<SpaceStatus, string> = {
    AVAILABLE: tokens.statusFree,
    OCCUPIED: tokens.statusOccupied,
    RESERVED: tokens.statusReserved,
    OUT_OF_SERVICE: tokens.statusOffline,
  }

  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [zoneId, setZoneId] = useState<number | ''>('')

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const zones = zonesQuery.data ?? []
  const activeZoneId = zoneId === '' ? zones[0]?.id : zoneId

  const spacesQuery = useQuery({
    queryKey: ['spaces', activeZoneId],
    queryFn: () => spacesApi.list(activeZoneId as number),
    enabled: Boolean(activeZoneId),
  })

  useOccupancyStream(() => {
    queryClient.invalidateQueries({ queryKey: ['spaces'] })
  })

  const occupancyMutation = useMutation({
    mutationFn: (payload: { spaceId: number; state: 'OCCUPIED' | 'VACANT' }) =>
      occupancyApi.record({ spaceId: payload.spaceId, state: payload.state, source: 'MANUAL' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spaces'] }),
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const spaces = spacesQuery.data ?? []

  const canvas = useMemo(() => {
    const maxX = Math.max(320, ...spaces.map((space) => (space.positionX ?? 0) + SPACE_W + 60))
    const maxY = Math.max(260, ...spaces.map((space) => (space.positionY ?? 0) + SPACE_H + 60))
    return { width: maxX, height: maxY }
  }, [spaces])

  return (
    <Box>
      <PageHeader
        title="Live parking map"
        subtitle="Spatial layout of spaces. Click a space to toggle occupancy in real time."
        action={
          <TextField
            select
            label="Zone"
            value={activeZoneId ?? ''}
            onChange={(event) => setZoneId(Number(event.target.value))}
            sx={{ minWidth: 220 }}
          >
            {zones.map((zone) => (
              <MenuItem key={zone.id} value={zone.id}>
                {zone.name} ({zone.code})
              </MenuItem>
            ))}
          </TextField>
        }
      />

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'] as SpaceStatus[]).map((status) => (
          <Stack key={status} direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: fillMap[status], border: `2px solid ${borderMap[status]}` }} />
            <Typography variant="caption" color="text.secondary">
              {status.replaceAll('_', ' ')}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {spacesQuery.isLoading || zonesQuery.isLoading ? (
        <LoadingState minHeight={360} />
      ) : (
        <Card>
          <CardContent sx={{ overflow: 'auto' }}>
            <Box
              sx={{
                position: 'relative',
                width: canvas.width,
                height: canvas.height,
                borderRadius: 2,
                backgroundImage: isDark
                  ? 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)'
                  : 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                border: `1px dashed ${theme.palette.divider}`,
              }}
            >
              {spaces.map((space) => (
                <Tooltip
                  key={space.id}
                  title={`${space.code ?? 'Unnamed'} · ${space.status} — click to ${
                    space.status === 'OCCUPIED' ? 'vacate' : 'occupy'
                  }`}
                >
                  <Box
                    onClick={() => {
                      if (space.status === 'OUT_OF_SERVICE') return
                      occupancyMutation.mutate({
                        spaceId: space.id,
                        state: space.status === 'OCCUPIED' ? 'VACANT' : 'OCCUPIED',
                      })
                    }}
                    sx={{
                      position: 'absolute',
                      left: space.positionX ?? 20,
                      top: space.positionY ?? 20,
                      width: SPACE_W,
                      height: SPACE_H,
                      borderRadius: 1.5,
                      bgcolor: fillMap[space.status],
                      border: `2px solid ${borderMap[space.status]}`,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: space.status === 'OUT_OF_SERVICE' ? 'not-allowed' : 'pointer',
                      transition: 'transform .15s ease',
                      '&:hover': { transform: 'scale(1.05)' },
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {space.code ?? '?'}
                      </Typography>
                      {space.label && (
                        <Typography variant="caption" color="text.secondary">
                          {space.label}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Tooltip>
              ))}
              {spaces.length === 0 && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <Typography color="text.secondary">No spaces positioned in this zone.</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
