import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { MenuItem, TextField } from '@mui/material'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import HoloLot from '../components/HoloLot'
import OperatorBaySheet from '../components/OperatorBaySheet'
import StatusLegend from '../components/StatusLegend'
import { toHoloLotBays } from '../utils/holoLotAdapter'
import LoadingState from '../components/LoadingState'
import { spacesApi, zonesApi } from '../api/parking'
import { occupancyApi } from '../api/occupancy'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useConfirm } from '../hooks/useConfirm'
import ErrorState from '../components/ErrorState'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { ParkingSpace } from '../types'

export default function ParkingMapPage() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [zoneId, setZoneId] = useState<number | ''>('')
  const [confirm, confirmDialog] = useConfirm()
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [changed, setChanged] = useState<{ trigger: number; bayId: number | null }>({ trigger: 0, bayId: null })

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
      if (event.zoneId !== activeZoneId) return
      setChanged((prev) => ({ trigger: prev.trigger + 1, bayId: event.spaceId }))
      queryClient.invalidateQueries({ queryKey: queryKeys.spaces.list(activeZoneId) })
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

  // The scene does its own normalisation; it only needs the raw rows here.
  const spaces = spacesQuery.data ?? []
  const activeZone = zones.find((zone) => zone.id === activeZoneId)
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null
  const pending = occupancyMutation.isPending

  return (
    <div>
      <PageHeader
        overline="Operations"
        title="Live parking map"
        subtitle="Occupancy across the fleet, updated live. Select a bay to record a car arriving or leaving."
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
        <>
          <HoloLot
            siteId={activeZone?.siteId ?? 0}
            zoneId={activeZoneId ?? 0}
            zoneName={activeZone ? `${activeZone.siteName} · ${activeZone.name}` : undefined}
            bays={toHoloLotBays(spaces)}
            selectedBayId={selectedSpaceId}
            onSelectBay={(bay) => {
              const space = bay ? spaces.find((item) => item.id === bay.id) : null
              setSelectedSpaceId(space ? space.id : null)
            }}
            selectableStatuses={['AVAILABLE', 'OCCUPIED']}
            sweepTrigger={changed.trigger}
            changedBayId={changed.bayId}
            height={500}
          />

          {selectedSpace ? (
            <OperatorBaySheet
              space={selectedSpace}
              canManage
              busy={pending}
              onMarkOccupied={() => void toggle(selectedSpace)}
              onMarkVacant={() => void toggle(selectedSpace)}
              onOutOfService={async () => {
                const ok = await confirm({
                  title: 'Take bay out of service?',
                  message: `${selectedSpace.code ?? selectedSpace.id} will stop accepting bookings until it is returned to service.`,
                  confirmLabel: 'Out of service',
                })
                if (ok) void toggle({ ...selectedSpace, status: 'AVAILABLE' })
              }}
              onClose={() => setSelectedSpaceId(null)}
            />
          ) : null}

          <StatusLegend />
        </>
      )}
      {confirmDialog}
    </div>
  )
}
