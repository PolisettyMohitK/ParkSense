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
import { queryKeys } from '../api/queryKeys'
import { useConfirm } from '../hooks/useConfirm'
import ErrorState from '../components/ErrorState'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { ParkingSpace, SpaceStatus } from '../types'
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
  const [confirm, confirmDialog] = useConfirm()

  const zonesQuery = useQuery({ queryKey: queryKeys.zones.list(), queryFn: () => zonesApi.list() })
  const zones = zonesQuery.data ?? []
  const activeZoneId = zoneId === '' ? zones[0]?.id : zoneId

  const spacesQuery = useQuery({
    queryKey: queryKeys.spaces.list(activeZoneId),
    queryFn: () => spacesApi.list(activeZoneId as number),
    enabled: Boolean(activeZoneId),
  })

  useOccupancyStream(
    (event) => {
      if (event.zoneId === activeZoneId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.spaces.list(activeZoneId) })
      }
    },
    { debounceMs: 250 },
  )

  const occupancyMutation = useMutation({
    mutationFn: (payload: { spaceId: number; state: 'OCCUPIED' | 'VACANT' }) =>
      occupancyApi.record({ spaceId: payload.spaceId, state: payload.state, source: 'MANUAL' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const toggle = async (space: ParkingSpace) => {
    if (space.status === 'OUT_OF_SERVICE' || occupancyMutation.isPending) return
    const vacate = space.status === 'OCCUPIED'
    const ok = await confirm({
      title: `${vacate ? 'Vacate' : 'Occupy'} space ${space.code ?? ''}?`,
      message: vacate
        ? 'This records the car as gone: the parking session is closed and priced.'
        : 'This records a car in the space and opens a parking session (linked to a booking if one is due now).',
      confirmLabel: vacate ? 'Mark vacant' : 'Mark occupied',
    })
    if (ok) occupancyMutation.mutate({ spaceId: space.id, state: vacate ? 'VACANT' : 'OCCUPIED' })
  }

  // Spaces without coordinates (e.g. created by hand) fall back to a tidy grid instead of stacking at 0,0.
  const spaces = (spacesQuery.data ?? []).map((space, index) => ({
    ...space,
    positionX: space.positionX ?? 20 + (index % 6) * (SPACE_W + 16),
    positionY: space.positionY ?? 20 + Math.floor(index / 6) * (SPACE_H + 16),
  }))

  const canvas = useMemo(() => {
    const maxX = Math.max(320, ...spaces.map((space) => (space.positionX ?? 0) + SPACE_W + 60))
    const maxY = Math.max(260, ...spaces.map((space) => (space.positionY ?? 0) + SPACE_H + 60))
    return { width: maxX, height: maxY }
  }, [spaces])

  return (
    <Box>
      <PageHeader
        title="Live parking map"
        subtitle="Spatial layout of spaces, updated live. Select a space to record a car arriving or leaving."
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
                {zone.siteName} · {zone.name}
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
      ) : zonesQuery.isError || spacesQuery.isError ? (
        <ErrorState
          subtitle={apiErrorMessage(zonesQuery.error ?? spacesQuery.error)}
          onRetry={() => {
            zonesQuery.refetch()
            spacesQuery.refetch()
          }}
        />
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
                    role="button"
                    tabIndex={space.status === 'OUT_OF_SERVICE' ? -1 : 0}
                    aria-label={`Space ${space.code ?? space.id}, ${space.status.toLowerCase().replace('_', ' ')}`}
                    onClick={() => toggle(space)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggle(space)
                      }
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
                      '&:hover, &:focus-visible': { transform: 'scale(1.05)', outline: 'none' },
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
      {confirmDialog}
    </Box>
  )
}
